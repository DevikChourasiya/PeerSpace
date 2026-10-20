import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Questionnaire } from '../src/models/questionnaire.model.js';
import { QuestionnaireVersion } from '../src/models/questionnaireVersion.model.js';
import { FeedbackRound } from '../src/models/feedbackRound.model.js';
import { FeedbackSubmission } from '../src/models/feedbackSubmission.model.js';
import { AuditLog } from '../src/models/auditLog.model.js';
import { checkScheduledRounds } from '../src/services/roundScheduler.service.js';
import {
  UserRole,
  UserStatus,
  QuestionType,
  RoundStatus,
  FeedbackVisibility,
} from '@peerspace/shared';

describe('Stage 6: Student Feedback Submissions, Analytics, Schedulers & Audit Logging', () => {
  const app = createApp();
  const timestamp = Date.now();
  const createdUserIds: string[] = [];
  const getSessionCookie = (res: { headers: Record<string, any> }): string => {
    const raw = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return cookies.find((c) => c.includes('peerspace.sid')) || '';
  };

  let adminCookie: string;
  let adminUserId: string;

  let student1Cookie: string;
  let student1UserId: string;

  let student2Cookie: string;
  let student2UserId: string;

  let publishedVersionId: string;
  let openRoundId: string;
  let anonymousRoundId: string;
  let closedRoundId: string;
  let scheduledRoundId: string;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Create Admin
    const adminPassword = 'AdminPassword123!';
    const adminUser = new User({
      name: 'Stage6 Admin',
      email: `stage6.admin.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(adminPassword),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    await adminUser.save();
    adminUserId = adminUser.id;
    createdUserIds.push(adminUserId);

    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: adminPassword,
    });
    adminCookie = getSessionCookie(adminLoginRes);

    // 2. Create Student 1 (Reviewer)
    const studentPassword = 'Password123!';
    const student1 = new User({
      name: 'Alice Reviewer',
      email: `alice.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(studentPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Computer Science',
      classSection: `CS-STAGE6-${timestamp}`,
      studentId: `STU-A-${timestamp}`,
    });
    await student1.save();
    student1UserId = student1.id;
    createdUserIds.push(student1UserId);

    const s1LoginRes = await request(app).post('/api/auth/login').send({
      email: student1.email,
      password: studentPassword,
    });
    student1Cookie = getSessionCookie(s1LoginRes);

    // 3. Create Student 2 (Peer Target)
    const student2 = new User({
      name: 'Bob Target',
      email: `bob.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(studentPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Computer Science',
      classSection: `CS-STAGE6-${timestamp}`,
      studentId: `STU-B-${timestamp}`,
    });
    await student2.save();
    student2UserId = student2.id;
    createdUserIds.push(student2UserId);

    const s2LoginRes = await request(app).post('/api/auth/login').send({
      email: student2.email,
      password: studentPassword,
    });
    student2Cookie = getSessionCookie(s2LoginRes);

    // 4. Create and publish a rubric questionnaire
    const rubricQ = new Questionnaire({
      title: 'Sprint Evaluation Rubric',
      description: 'Peer evaluation on technical and teamwork skills',
      category: 'Engineering',
      questions: [
        {
          id: 'q_collab',
          order: 0,
          title: 'Collaboration & Teamwork',
          description: 'How effectively did the peer collaborate?',
          category: 'Collaboration',
          type: QuestionType.STAR_RATING,
          required: true,
          scaleMax: 5,
        },
        {
          id: 'q_tech',
          order: 1,
          title: 'Technical Competence',
          description: 'Assess code quality and technical depth',
          category: 'Technical Rigor',
          type: QuestionType.NUMERIC_RATING,
          required: true,
          scaleMin: 1,
          scaleMax: 10,
        },
        {
          id: 'q_comment',
          order: 2,
          title: 'Qualitative Constructive Feedback',
          type: QuestionType.LONG_TEXT,
          required: false,
        },
      ],
      createdBy: adminUserId,
    });
    await rubricQ.save();

    // Publish version
    const pubRes = await request(app)
      .post(`/api/admin/questionnaires/${rubricQ.id}/publish`)
      .set('Cookie', adminCookie)
      .send({ changeSummary: 'Initial release' });

    publishedVersionId = pubRes.body.publishedVersion.id;

    // 5. Create an OPEN named feedback round
    const openRound = new FeedbackRound({
      title: 'Active Midterm Round',
      questionnaireId: rubricQ.id,
      questionnaireVersionId: publishedVersionId,
      status: RoundStatus.OPEN,
      startDate: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // tomorrow
      isAnonymous: false,
      allowSubmissionEdit: true,
      submissionsPerPeer: 2,
      feedbackVisibility: FeedbackVisibility.IMMEDIATE,
      targetClass: `CS-STAGE6-${timestamp}`,
      createdBy: adminUserId,
    });
    await openRound.save();
    openRoundId = openRound.id;

    // 6. Create an ANONYMOUS feedback round
    const anonRound = new FeedbackRound({
      title: 'Anonymous Sprint Review',
      questionnaireId: rubricQ.id,
      questionnaireVersionId: publishedVersionId,
      status: RoundStatus.OPEN,
      startDate: new Date(Date.now() - 1000 * 60 * 60),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
      isAnonymous: true,
      allowSubmissionEdit: false,
      submissionsPerPeer: 2,
      feedbackVisibility: FeedbackVisibility.IMMEDIATE,
      targetClass: `CS-STAGE6-${timestamp}`,
      createdBy: adminUserId,
    });
    await anonRound.save();
    anonymousRoundId = anonRound.id;

    // 7. Create a CLOSED feedback round
    const closedRound = new FeedbackRound({
      title: 'Closed Evaluation Round',
      questionnaireId: rubricQ.id,
      questionnaireVersionId: publishedVersionId,
      status: RoundStatus.CLOSED,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 48),
      deadline: new Date(Date.now() - 1000 * 60 * 60 * 24),
      isAnonymous: true,
      allowSubmissionEdit: false,
      submissionsPerPeer: 1,
      feedbackVisibility: FeedbackVisibility.AFTER_DEADLINE,
      targetClass: `CS-STAGE6-${timestamp}`,
      createdBy: adminUserId,
    });
    await closedRound.save();
    closedRoundId = closedRound.id;
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await FeedbackRound.deleteMany({ targetClass: `CS-STAGE6-${timestamp}` });
        await FeedbackSubmission.deleteMany({
          reviewerId: { $in: [student1UserId, student2UserId] },
        });
        await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      }
    } finally {
      await disconnectDatabase();
    }
  });

  describe('1. Peer Candidate Discovery & Eligibility', () => {
    it('returns eligible cohort peers for evaluation excluding the current student', async () => {
      const res = await request(app)
        .get(`/api/rounds/${openRoundId}/peers`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.candidates).toBeInstanceOf(Array);

      const candidates = res.body.data.candidates;
      // Should include Bob (student 2)
      const bob = candidates.find((c: any) => c.id === student2UserId);
      expect(bob).toBeDefined();
      expect(bob.name).toBe('Bob Target');
      expect(bob.submissionStatus).toBe('not_started');

      // Should NOT include Alice (student 1 herself)
      const alice = candidates.find((c: any) => c.id === student1UserId);
      expect(alice).toBeUndefined();
    });

    it('rejects unauthenticated requests to peer discovery', async () => {
      const res = await request(app).get(`/api/rounds/${openRoundId}/peers`);
      expect(res.status).toBe(401);
    });
  });

  describe('2. Draft Creation, Autosaving & Peer Retrieval', () => {
    it('allows student to save an incomplete draft without failing required question checks', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions/draft`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            {
              questionId: 'q_collab',
              questionType: QuestionType.STAR_RATING,
              rating: 4,
            },
            // Note: q_tech (required) is omitted in this draft
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.targetStudentId).toBe(student2UserId);
    });

    it('retrieves the saved draft via GET /peer/:peerId', async () => {
      const res = await request(app)
        .get(`/api/rounds/${openRoundId}/submissions/peer/${student2UserId}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.responses[0].rating).toBe(4);
    });

    it('shows peer status as "draft" in candidates list after draft save', async () => {
      const res = await request(app)
        .get(`/api/rounds/${openRoundId}/peers`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      const bob = res.body.data.candidates.find((c: any) => c.id === student2UserId);
      expect(bob.submissionStatus).toBe('draft');
    });

    it('prohibits self-review drafts', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions/draft`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student1UserId,
          responses: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_REVIEW_PROHIBITED');
    });
  });

  describe('3. Evaluation Final Submission & Rubric Validation', () => {
    it('fails final submission when required question is missing', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            {
              questionId: 'q_collab',
              questionType: QuestionType.STAR_RATING,
              rating: 5,
            },
            // q_tech missing
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REQUIRED_QUESTION_MISSING');
    });

    it('fails final submission when score exceeds scale bound', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            {
              questionId: 'q_collab',
              questionType: QuestionType.STAR_RATING,
              rating: 10, // Max is 5!
            },
            {
              questionId: 'q_tech',
              questionType: QuestionType.NUMERIC_RATING,
              rating: 8,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RATING_BOUND');
    });

    it('successfully finalizes evaluation when all required questions are valid', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            {
              questionId: 'q_collab',
              questionType: QuestionType.STAR_RATING,
              rating: 5,
            },
            {
              questionId: 'q_tech',
              questionType: QuestionType.NUMERIC_RATING,
              rating: 9,
            },
            {
              questionId: 'q_comment',
              questionType: QuestionType.LONG_TEXT,
              comment: 'Exceptional architectural thinking and teamwork!',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.submittedAt).toBeDefined();
    });

    it('prevents duplicate submission for the same peer in the same round', async () => {
      const res = await request(app)
        .post(`/api/rounds/${openRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            {
              questionId: 'q_collab',
              questionType: QuestionType.STAR_RATING,
              rating: 5,
            },
            {
              questionId: 'q_tech',
              questionType: QuestionType.NUMERIC_RATING,
              rating: 9,
            },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_SUBMITTED');
    });

    it('rejects submissions for closed rounds with 400 ROUND_NOT_OPEN', async () => {
      const res = await request(app)
        .post(`/api/rounds/${closedRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
            { questionId: 'q_tech', questionType: QuestionType.NUMERIC_RATING, rating: 9 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ROUND_NOT_OPEN');
    });
  });

  describe('4. Pre-Deadline Submission Editing', () => {
    it('allows student to edit submission when allowSubmissionEdit is true', async () => {
      // Find submission ID
      const getRes = await request(app)
        .get(`/api/rounds/${openRoundId}/submissions/peer/${student2UserId}`)
        .set('Cookie', student1Cookie);

      const submissionId = getRes.body.data.id;

      const editRes = await request(app)
        .put(`/api/rounds/${openRoundId}/submissions/${submissionId}`)
        .set('Cookie', student1Cookie)
        .send({
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
            { questionId: 'q_tech', questionType: QuestionType.NUMERIC_RATING, rating: 10 },
            {
              questionId: 'q_comment',
              questionType: QuestionType.LONG_TEXT,
              comment: 'Updated evaluation.',
            },
          ],
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.success).toBe(true);
      expect(editRes.body.data.responses[0].rating).toBe(4);
      expect(editRes.body.data.responses[1].rating).toBe(10);
    });

    it('rejects edit when round allowSubmissionEdit is false', async () => {
      // Create a submission in anonymousRoundId (where allowSubmissionEdit is false)
      const subRes = await request(app)
        .post(`/api/rounds/${anonymousRoundId}/submissions`)
        .set('Cookie', student1Cookie)
        .send({
          targetStudentId: student2UserId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
            { questionId: 'q_tech', questionType: QuestionType.NUMERIC_RATING, rating: 8 },
          ],
        });

      const submissionId = subRes.body.data.id;

      const editRes = await request(app)
        .put(`/api/rounds/${anonymousRoundId}/submissions/${submissionId}`)
        .set('Cookie', student1Cookie)
        .send({
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 3 },
          ],
        });

      expect(editRes.status).toBe(403);
      expect(editRes.body.error.code).toBe('SUBMISSION_EDIT_NOT_ALLOWED');
    });
  });

  describe('5. Received Feedback & Anonymity Enforcement', () => {
    it('returns feedback received by student with reviewer identity masked when isAnonymous is true', async () => {
      // Bob checks received feedback
      const res = await request(app).get('/api/feedback/received').set('Cookie', student2Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Find the anonymous one
      const anonItem = res.body.data.find(
        (item: any) => item.roundTitle === 'Anonymous Sprint Review'
      );
      expect(anonItem).toBeDefined();
      expect(anonItem.isAnonymous).toBe(true);
      expect(anonItem.reviewerDisplayName).toBe('Anonymous Peer');
      expect(anonItem.reviewerId).toBeUndefined();

      // Find the named one
      const namedItem = res.body.data.find(
        (item: any) => item.roundTitle === 'Active Midterm Round'
      );
      expect(namedItem).toBeDefined();
      expect(namedItem.isAnonymous).toBe(false);
      expect(namedItem.reviewerDisplayName).toBe('Alice Reviewer');
    });
  });

  describe('6. Student Growth Analytics & Chart.js Aggregations', () => {
    it('computes competency benchmarks, rating distribution, and longitudinal metrics', async () => {
      const res = await request(app).get('/api/feedback/analytics').set('Cookie', student2Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.totalEvaluationsReceived).toBeGreaterThanOrEqual(2);
      expect(data.overallAverageScore).toBeGreaterThan(0);
      expect(data.cohortAverageScore).toBeGreaterThan(0);

      // Competencies array
      expect(data.competencies).toBeInstanceOf(Array);
      const collab = data.competencies.find((c: any) => c.category === 'Collaboration');
      expect(collab).toBeDefined();
      expect(collab.studentAverage).toBeGreaterThan(0);
      expect(collab.cohortAverage).toBeGreaterThan(0);

      // Rating distribution
      expect(data.ratingDistribution).toBeInstanceOf(Array);
      expect(data.ratingDistribution.length).toBe(5);

      // Timeline longitudinal data
      expect(data.timeline).toBeInstanceOf(Array);
      expect(data.timeline.length).toBeGreaterThan(0);
      expect(data.timeline[0].roundTitle).toBeDefined();
      expect(data.timeline[0].averageScore).toBeGreaterThan(0);
    });

    it('returns zero-data structure cleanly when student has received no evaluations', async () => {
      // Alice has received 0 evaluations
      const res = await request(app).get('/api/feedback/analytics').set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEvaluationsReceived).toBe(0);
      expect(res.body.data.overallAverageScore).toBe(0);
      expect(res.body.data.competencies.length).toBeGreaterThan(0);
    });
  });

  describe('7. Scheduled Feedback Round Activation', () => {
    it('automatically transitions a scheduled round whose start date has arrived to OPEN', async () => {
      // Create a round scheduled for the past (start date 5 minutes ago)
      const scheduledRound = new FeedbackRound({
        title: 'Auto-Activated Scheduled Round',
        questionnaireId: publishedVersionId,
        questionnaireVersionId: publishedVersionId,
        status: RoundStatus.SCHEDULED,
        startDate: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
        targetClass: `CS-STAGE6-${timestamp}`,
        createdBy: adminUserId,
      });
      await scheduledRound.save();
      scheduledRoundId = scheduledRound.id;

      // Trigger the background scheduler check directly
      const activatedCount = await checkScheduledRounds();
      expect(activatedCount).toBeGreaterThanOrEqual(1);

      // Verify the round is now OPEN in MongoDB
      const updatedRound = await FeedbackRound.findById(scheduledRoundId);
      expect(updatedRound?.status).toBe(RoundStatus.OPEN);
    });

    it('does not auto-activate a scheduled round if publication guard is missing questionnaireVersionId', async () => {
      const invalidScheduled = new FeedbackRound({
        title: 'Invalid Scheduled Round Without Version',
        status: RoundStatus.SCHEDULED,
        startDate: new Date(Date.now() - 1000 * 60 * 5),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
        targetClass: `CS-STAGE6-${timestamp}`,
        createdBy: adminUserId,
      });
      await invalidScheduled.save();

      const activatedCount = await checkScheduledRounds();
      expect(activatedCount).toBe(0);

      const fetched = await FeedbackRound.findById(invalidScheduled.id);
      expect(fetched?.status).toBe(RoundStatus.SCHEDULED); // Stays scheduled!

      await FeedbackRound.findByIdAndDelete(invalidScheduled.id);
    });
  });

  describe('8. Administrator Audit Logging', () => {
    it('records audit events for administrator membership approvals and actions', async () => {
      // Create a student to approve
      const pendingStudent = new User({
        name: 'Pending Audit Test',
        email: `pending.audit.${timestamp}@university.edu`,
        passwordHash: await User.hashPassword('Pass123!'),
        role: UserRole.STUDENT,
        status: UserStatus.PENDING,
      });
      await pendingStudent.save();
      createdUserIds.push(pendingStudent.id);

      // Admin approves
      await request(app)
        .post(`/api/admin/memberships/${pendingStudent.id}/approve`)
        .set('Cookie', adminCookie);

      // Verify audit log
      const res = await request(app).get('/api/admin/audit-logs').set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeInstanceOf(Array);

      const approvalLog = res.body.data.items.find(
        (item: any) => item.action === 'MEMBERSHIP_APPROVED' && item.entityId === pendingStudent.id
      );
      expect(approvalLog).toBeDefined();
      expect(approvalLog.actorEmail).toBe(`stage6.admin.${timestamp}@university.edu`);
      expect(approvalLog.details.studentEmail).toBe(pendingStudent.email);
    });

    it('denies students access to administrator audit logs with 403', async () => {
      const res = await request(app).get('/api/admin/audit-logs').set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
    });
  });
});
