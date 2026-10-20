import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Questionnaire } from '../src/models/questionnaire.model.js';
import { QuestionnaireVersion } from '../src/models/questionnaireVersion.model.js';
import { FeedbackRound } from '../src/models/feedbackRound.model.js';
import { FeedbackSubmission } from '../src/models/feedbackSubmission.model.js';
import { FeedbackReport } from '../src/models/feedbackReport.model.js';
import { AuditLog } from '../src/models/auditLog.model.js';
import {
  UserRole,
  UserStatus,
  QuestionType,
  RoundStatus,
  FeedbackVisibility,
  ReportReason,
  ReportStatus,
  ModerationResolutionAction,
  AuditAction,
} from '@peerspace/shared';

describe('Feedback Flagging & Moderation (Milestone 1)', () => {
  const app = createApp();
  const timestamp = Date.now();
  const createdUserIds: string[] = [];
  const createdRoundIds: string[] = [];
  const createdQuestionnaireIds: string[] = [];
  const createdReportIds: string[] = [];

  const getSessionCookie = (res: { headers: Record<string, any> }): string => {
    const raw = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return cookies.find((c) => c.includes('peerspace.sid')) || '';
  };

  let adminCookie: string;
  let adminUserId: string;

  let targetStudentCookie: string;
  let targetStudentId: string;

  let reviewerStudentCookie: string;
  let reviewerStudentId: string;

  let thirdPartyStudentCookie: string;
  let thirdPartyStudentId: string;

  let pendingStudentCookie: string;
  let pendingStudentId: string;

  let openRoundId: string;
  let unreleasedRoundId: string;
  let testSubmissionId: string;
  let unreleasedSubmissionId: string;

  const testQuestionId = 'q_collab_comment';

  beforeAll(async () => {
    await connectDatabase();

    const commonPassword = 'Password123!';

    // 1. Admin
    const admin = new User({
      name: 'Moderation Admin',
      email: `mod-admin-${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    await admin.save();
    adminUserId = admin.id;
    createdUserIds.push(admin.id);

    // 2. Target Student
    const targetStudent = new User({
      name: 'Target Student',
      email: `target-${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: 'MOD-CLASS-101',
    });
    await targetStudent.save();
    targetStudentId = targetStudent.id;
    createdUserIds.push(targetStudent.id);

    // 3. Reviewer Student
    const reviewerStudent = new User({
      name: 'Reviewer Student',
      email: `reviewer-${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: 'MOD-CLASS-101',
    });
    await reviewerStudent.save();
    reviewerStudentId = reviewerStudent.id;
    createdUserIds.push(reviewerStudent.id);

    // 4. Third-Party Student
    const thirdPartyStudent = new User({
      name: 'Third Party Student',
      email: `thirdparty-${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: 'MOD-CLASS-101',
    });
    await thirdPartyStudent.save();
    thirdPartyStudentId = thirdPartyStudent.id;
    createdUserIds.push(thirdPartyStudent.id);

    // 5. Pending Student
    const pendingStudent = new User({
      name: 'Pending Student',
      email: `pending-${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
      isEmailVerified: true,
      classSection: 'MOD-CLASS-101',
    });
    await pendingStudent.save();
    pendingStudentId = pendingStudent.id;
    createdUserIds.push(pendingStudent.id);

    // Authenticate and obtain session cookies
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: commonPassword });
    adminCookie = getSessionCookie(adminLoginRes);

    const targetLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: targetStudent.email, password: commonPassword });
    targetStudentCookie = getSessionCookie(targetLoginRes);

    const reviewerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: reviewerStudent.email, password: commonPassword });
    reviewerStudentCookie = getSessionCookie(reviewerLoginRes);

    const thirdPartyLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: thirdPartyStudent.email, password: commonPassword });
    thirdPartyStudentCookie = getSessionCookie(thirdPartyLoginRes);

    const pendingLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: pendingStudent.email, password: commonPassword });
    pendingStudentCookie = getSessionCookie(pendingLoginRes);

    // 6. Questionnaire & published version
    const questionnaire = new Questionnaire({
      title: 'Moderation Test Rubric',
      category: 'General',
      questions: [
        {
          id: testQuestionId,
          order: 1,
          type: QuestionType.STAR_RATING,
          title: 'Collaboration & Teamwork',
          category: 'Teamwork',
          required: true,
          scaleMax: 5,
        },
      ],
      createdBy: adminUserId,
    });
    await questionnaire.save();
    createdQuestionnaireIds.push(questionnaire.id);

    const pubRes = await request(app)
      .post(`/api/admin/questionnaires/${questionnaire.id}/publish`)
      .set('Cookie', adminCookie)
      .send({ changeSummary: 'Release 1' });
    const versionId = pubRes.body.publishedVersion.id;

    // 7. Visible Round (IMMEDIATE visibility)
    const openRound = new FeedbackRound({
      title: 'Released Feedback Round',
      questionnaireId: questionnaire.id,
      questionnaireVersionId: versionId,
      status: RoundStatus.CLOSED,
      startDate: new Date(Date.now() - 7200000),
      deadline: new Date(Date.now() - 3600000),
      isAnonymous: true,
      feedbackVisibility: FeedbackVisibility.IMMEDIATE,
      targetClass: 'MOD-CLASS-101',
      createdBy: adminUserId,
    });
    await openRound.save();
    openRoundId = openRound.id;
    createdRoundIds.push(openRound.id);

    // 8. Submission in Visible Round
    const submission = new FeedbackSubmission({
      roundId: openRound.id,
      questionnaireVersionId: versionId,
      reviewerId: reviewerStudentId,
      targetStudentId: targetStudentId,
      status: 'submitted',
      isAnonymous: true,
      responses: [
        {
          questionId: testQuestionId,
          questionType: QuestionType.STAR_RATING,
          rating: 2,
          comment: 'You never show up to meetings and you are totally useless.',
        },
      ],
      submittedAt: new Date(),
    });
    await submission.save();
    testSubmissionId = submission.id;

    // 9. Unreleased Round (AFTER_DEADLINE with deadline in future)
    const unreleasedRound = new FeedbackRound({
      title: 'Unreleased Feedback Round',
      questionnaireId: questionnaire.id,
      questionnaireVersionId: versionId,
      status: RoundStatus.OPEN,
      startDate: new Date(Date.now() - 3600000),
      deadline: new Date(Date.now() + 86400000),
      isAnonymous: true,
      feedbackVisibility: FeedbackVisibility.AFTER_DEADLINE,
      targetClass: 'MOD-CLASS-101',
      createdBy: adminUserId,
    });
    await unreleasedRound.save();
    unreleasedRoundId = unreleasedRound.id;
    createdRoundIds.push(unreleasedRound.id);

    // 10. Submission in Unreleased Round
    const unreleasedSub = new FeedbackSubmission({
      roundId: unreleasedRound.id,
      questionnaireVersionId: versionId,
      reviewerId: reviewerStudentId,
      targetStudentId: targetStudentId,
      status: 'submitted',
      isAnonymous: true,
      responses: [
        {
          questionId: testQuestionId,
          questionType: QuestionType.STAR_RATING,
          rating: 3,
          comment: 'This should not be reportable yet because the round is still open.',
        },
      ],
      submittedAt: new Date(),
    });
    await unreleasedSub.save();
    unreleasedSubmissionId = unreleasedSub.id;
  });

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await FeedbackReport.deleteMany({ _id: { $in: createdReportIds } });
    }
    if (testSubmissionId) {
      await FeedbackSubmission.deleteMany({
        _id: { $in: [testSubmissionId, unreleasedSubmissionId] },
      });
    }
    if (createdRoundIds.length > 0) {
      await FeedbackRound.deleteMany({ _id: { $in: createdRoundIds } });
    }
    if (createdQuestionnaireIds.length > 0) {
      await Questionnaire.deleteMany({ _id: { $in: createdQuestionnaireIds } });
      await QuestionnaireVersion.deleteMany({
        questionnaireId: { $in: createdQuestionnaireIds },
      });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await AuditLog.deleteMany({
      action: { $in: [AuditAction.FEEDBACK_REPORTED, AuditAction.FEEDBACK_MODERATED] },
    });
    await disconnectDatabase();
  });

  // =========================================================================
  // 1. Student Reporting Access Controls & Validation
  // =========================================================================
  describe('1. Student Feedback Reporting Access & Validation', () => {
    it('rejects unauthenticated user with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/feedback/reports').send({
        submissionId: testSubmissionId,
        questionId: testQuestionId,
        reason: ReportReason.HARASSMENT,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects pending student account with 403 MEMBERSHIP_PENDING', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', pendingStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: testQuestionId,
          reason: ReportReason.HARASSMENT,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('MEMBERSHIP_PENDING');
    });

    it('rejects invalid submission ID format with 400 INVALID_SUBMISSION_ID', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: 'not-a-valid-mongo-id',
          questionId: testQuestionId,
          reason: ReportReason.HARASSMENT,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('INVALID_SUBMISSION_ID');
    });

    it('rejects non-existent submission with 404 SUBMISSION_NOT_FOUND', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: fakeId,
          questionId: testQuestionId,
          reason: ReportReason.HARASSMENT,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('SUBMISSION_NOT_FOUND');
    });

    it('rejects report when student is not the target recipient with 403 UNAUTHORIZED_FEEDBACK_ACCESS', async () => {
      // Third-party student attempts to report targetStudent's received feedback
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', thirdPartyStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: testQuestionId,
          reason: ReportReason.HARASSMENT,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('UNAUTHORIZED_FEEDBACK_ACCESS');
    });

    it('rejects report when round feedback has not yet been released with 403 FEEDBACK_NOT_RELEASED', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: unreleasedSubmissionId,
          questionId: testQuestionId,
          reason: ReportReason.UNCONSTRUCTIVE,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('FEEDBACK_NOT_RELEASED');
    });

    it('rejects invalid or missing report reason with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: testQuestionId,
          reason: 'invalid_nonexistent_reason',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects question ID that contains no comment with 400 NO_COMMENT_TO_REPORT', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: 'non_existent_question_id',
          reason: ReportReason.HARASSMENT,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('NO_COMMENT_TO_REPORT');
    });
  });

  // =========================================================================
  // 2. Successful Report Submission & Anonymity Preservation
  // =========================================================================
  describe('2. Report Persistence, Duplicate Protection & Privacy', () => {
    let createdReportId: string;

    it('allows target student to report abusive comment and creates pending report record', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: testQuestionId,
          reason: ReportReason.HARASSMENT,
          explanation: 'This evaluation contains personal insults and violates guidelines.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ReportStatus.PENDING);
      expect(res.body.data.reason).toBe(ReportReason.HARASSMENT);

      createdReportId = res.body.data.id;
      createdReportIds.push(createdReportId);

      // Verify privacy: response NEVER leaks reviewerId or reviewerName
      expect(res.body.data.reviewerId).toBeUndefined();
      expect(res.body.data.reviewerName).toBeUndefined();
      expect(res.body.data.reviewerEmail).toBeUndefined();

      // Verify database record snapshots the comment safely
      const savedReport = await FeedbackReport.findById(createdReportId);
      expect(savedReport).not.toBeNull();
      expect(savedReport?.reportedComment).toContain('totally useless');
      expect(savedReport?.status).toBe(ReportStatus.PENDING);
    });

    it('rejects duplicate active report from the same student for the same comment with 409 DUPLICATE_REPORT', async () => {
      const res = await request(app)
        .post('/api/feedback/reports')
        .set('Cookie', targetStudentCookie)
        .send({
          submissionId: testSubmissionId,
          questionId: testQuestionId,
          reason: ReportReason.OFFENSIVE_LANGUAGE,
          explanation: 'Attempting to report again while report is already pending.',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('DUPLICATE_REPORT');
    });

    it('records an immutable audit event for the submitted report', async () => {
      const auditLog = await AuditLog.findOne({
        action: AuditAction.FEEDBACK_REPORTED,
        entityId: createdReportId,
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId.toString()).toBe(targetStudentId);
      expect(auditLog?.details.reason).toBe(ReportReason.HARASSMENT);
    });
  });

  // =========================================================================
  // 3. Admin Moderation Queue & Content Actions
  // =========================================================================
  describe('3. Admin Moderation Queue & Resolution Workflows', () => {
    it('blocks student from accessing admin moderation queue with 403', async () => {
      const res = await request(app)
        .get('/api/admin/moderation/reports')
        .set('Cookie', targetStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows admin to list moderation reports with pagination and reviewer anonymity preserved', async () => {
      const res = await request(app)
        .get('/api/admin/moderation/reports?status=pending')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const reportItem = res.body.data.items[0];
      expect(reportItem.reportedComment).toContain('totally useless');
      expect(reportItem.reporterName).toBe('Target Student');
      expect(reportItem.roundTitle).toBe('Released Feedback Round');

      // Crucial privacy check: moderation queue does not reveal reviewer identity
      expect(reportItem.reviewerId).toBeUndefined();
      expect(reportItem.reviewerName).toBeUndefined();
      expect(reportItem.reviewerEmail).toBeUndefined();
    });

    it('blocks student from calling report resolution endpoint with 403', async () => {
      const report = await FeedbackReport.findOne({ submissionId: testSubmissionId });
      const res = await request(app)
        .post(`/api/admin/moderation/reports/${report?.id}/resolve`)
        .set('Cookie', targetStudentCookie)
        .send({
          action: ModerationResolutionAction.HIDE_COMMENT,
          note: 'Unauthorized resolution attempt.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects resolution attempt without required moderation note with 400 VALIDATION_ERROR', async () => {
      const report = await FeedbackReport.findOne({ submissionId: testSubmissionId });
      const res = await request(app)
        .post(`/api/admin/moderation/reports/${report?.id}/resolve`)
        .set('Cookie', adminCookie)
        .send({
          action: ModerationResolutionAction.HIDE_COMMENT,
          // note omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('allows admin to hide/redact abusive comment and marks report resolved', async () => {
      const report = await FeedbackReport.findOne({ submissionId: testSubmissionId });
      const res = await request(app)
        .post(`/api/admin/moderation/reports/${report?.id}/resolve`)
        .set('Cookie', adminCookie)
        .send({
          action: ModerationResolutionAction.HIDE_COMMENT,
          note: 'Confirmed abusive language. Comment hidden from student dashboard.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ReportStatus.RESOLVED);
      expect(res.body.data.actionTaken).toBe(ModerationResolutionAction.HIDE_COMMENT);

      // Verify submission in database has isCommentHidden set to true
      const updatedSub = await FeedbackSubmission.findById(testSubmissionId);
      const respItem = updatedSub?.responses.find((r) => r.questionId === testQuestionId);
      expect(respItem?.isCommentHidden).toBe(true);

      // Verify audit log
      const auditLog = await AuditLog.findOne({
        action: AuditAction.FEEDBACK_MODERATED,
        entityId: report?.id,
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.details.action).toBe(ModerationResolutionAction.HIDE_COMMENT);
    });

    it('ensures hidden comment is excluded from GET /api/feedback/received for target student', async () => {
      const res = await request(app)
        .get('/api/feedback/received')
        .set('Cookie', targetStudentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const receivedItem = res.body.data.find((item: any) => item.id === testSubmissionId);
      expect(receivedItem).toBeDefined();

      const questionResp = receivedItem.responses.find((r: any) => r.questionId === testQuestionId);
      expect(questionResp).toBeDefined();

      // Comment must be omitted / undefined
      expect(questionResp.comment).toBeUndefined();
      expect(questionResp.isCommentHidden).toBe(true);

      // Numerical score is strictly preserved
      expect(questionResp.rating).toBe(2);
    });

    it('preserves aggregate competency scores in GET /api/feedback/analytics', async () => {
      const res = await request(app)
        .get('/api/feedback/analytics')
        .set('Cookie', targetStudentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEvaluationsReceived).toBe(1);
      expect(res.body.data.overallAverageScore).toBe(2);

      const teamwork = res.body.data.competencies.find((c: any) => c.category === 'Teamwork');
      expect(teamwork).toBeDefined();
      expect(teamwork.studentAverage).toBe(2);
    });

    it('allows admin to reverse/restore comment if needed', async () => {
      const report = await FeedbackReport.findOne({ submissionId: testSubmissionId });
      const res = await request(app)
        .post(`/api/admin/moderation/reports/${report?.id}/resolve`)
        .set('Cookie', adminCookie)
        .send({
          action: ModerationResolutionAction.RESTORE_COMMENT,
          note: 'Appeal reviewed and comment restored.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actionTaken).toBe(ModerationResolutionAction.RESTORE_COMMENT);

      // Verify comment is visible again in GET /api/feedback/received
      const feedbackRes = await request(app)
        .get('/api/feedback/received')
        .set('Cookie', targetStudentCookie);

      const receivedItem = feedbackRes.body.data.find((item: any) => item.id === testSubmissionId);
      const questionResp = receivedItem.responses.find((r: any) => r.questionId === testQuestionId);
      expect(questionResp.comment).toContain('totally useless');
      expect(questionResp.isCommentHidden).toBe(false);
    });

    it('allows admin to dismiss report with note', async () => {
      // Re-report to test dismiss action
      const report2 = await FeedbackReport.create({
        submissionId: testSubmissionId,
        questionId: testQuestionId,
        reportedComment: 'Test comment for dismissal',
        reporterId: targetStudentId,
        reason: ReportReason.UNCONSTRUCTIVE,
        status: ReportStatus.PENDING,
      });
      createdReportIds.push(report2.id);

      const res = await request(app)
        .post(`/api/admin/moderation/reports/${report2.id}/resolve`)
        .set('Cookie', adminCookie)
        .send({
          action: ModerationResolutionAction.DISMISS,
          note: 'Comment determined to be constructive criticism.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ReportStatus.DISMISSED);
      expect(res.body.data.actionTaken).toBe(ModerationResolutionAction.DISMISS);
    });
  });
});
