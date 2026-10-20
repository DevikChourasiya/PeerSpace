import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Questionnaire } from '../src/models/questionnaire.model.js';
import { QuestionnaireVersion } from '../src/models/questionnaireVersion.model.js';
import { FeedbackRound } from '../src/models/feedbackRound.model.js';
import { FeedbackSubmission } from '../src/models/feedbackSubmission.model.js';
import { DEFAULT_DEV_SESSION_SECRET, envSchema, parseEnv } from '../src/config/env.js';
import { verifyProvisioningSecret, parseCliArgs } from '../scripts/provision-admin.js';
import {
  UserRole,
  UserStatus,
  QuestionType,
  RoundStatus,
  FeedbackVisibility,
} from '@peerspace/shared';

describe('Security Remediation Phase 1 Verification', () => {
  const app = createApp();
  const timestamp = Date.now();
  const createdUserIds: string[] = [];
  const createdRoundIds: string[] = [];
  const createdQuestionnaireIds: string[] = [];

  const getSessionCookie = (res: { headers: Record<string, any> }): string => {
    const raw = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return cookies.find((c) => c.includes('peerspace.sid')) || '';
  };

  let adminCookie: string;
  let adminUserId: string;

  let cohortAStudent1Cookie: string;
  let cohortAStudent1Id: string;

  let cohortAStudent2Cookie: string;
  let cohortAStudent2Id: string;

  let cohortBStudentCookie: string;
  let cohortBStudentId: string;

  let pendingStudentCookie: string;
  let pendingStudentId: string;

  let suspendedStudentId: string;

  let publishedVersionId: string;
  let testRoundId: string;
  let testQuestionnaireId: string;

  const cohortA = `SEC-COHORT-A-${timestamp}`;
  const cohortB = `SEC-COHORT-B-${timestamp}`;

  beforeAll(async () => {
    await connectDatabase();

    const commonPassword = 'Password123!';

    // 1. Create Admin
    const admin = new User({
      name: 'Sec Admin',
      email: `sec.admin.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    await admin.save();
    adminUserId = admin.id;
    createdUserIds.push(adminUserId);

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: admin.email,
      password: commonPassword,
    });
    adminCookie = getSessionCookie(adminLogin);

    // 2. Cohort A Student 1 (Reviewer)
    const studentA1 = new User({
      name: 'Cohort A Reviewer',
      email: `sec.a1.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: cohortA,
      studentId: `A1_${timestamp}`,
    });
    await studentA1.save();
    cohortAStudent1Id = studentA1.id;
    createdUserIds.push(cohortAStudent1Id);

    const a1Login = await request(app).post('/api/auth/login').send({
      email: studentA1.email,
      password: commonPassword,
    });
    cohortAStudent1Cookie = getSessionCookie(a1Login);

    // 3. Cohort A Student 2 (Target)
    const studentA2 = new User({
      name: 'Cohort A Peer',
      email: `sec.a2.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: cohortA,
      studentId: `A2_${timestamp}`,
    });
    await studentA2.save();
    cohortAStudent2Id = studentA2.id;
    createdUserIds.push(cohortAStudent2Id);

    const a2Login = await request(app).post('/api/auth/login').send({
      email: studentA2.email,
      password: commonPassword,
    });
    cohortAStudent2Cookie = getSessionCookie(a2Login);

    // 4. Cohort B Student (Cross-cohort intruder / target)
    const studentB = new User({
      name: 'Cohort B Student',
      email: `sec.b.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      classSection: cohortB,
      studentId: `B_${timestamp}`,
    });
    await studentB.save();
    cohortBStudentId = studentB.id;
    createdUserIds.push(cohortBStudentId);

    const bLogin = await request(app).post('/api/auth/login').send({
      email: studentB.email,
      password: commonPassword,
    });
    cohortBStudentCookie = getSessionCookie(bLogin);

    // 5. Pending Student
    const pendingStudent = new User({
      name: 'Pending Student',
      email: `sec.pending.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
      classSection: cohortA,
    });
    await pendingStudent.save();
    pendingStudentId = pendingStudent.id;
    createdUserIds.push(pendingStudentId);

    const pendingLogin = await request(app).post('/api/auth/login').send({
      email: pendingStudent.email,
      password: commonPassword,
    });
    pendingStudentCookie = getSessionCookie(pendingLogin);

    // 6. Suspended Student
    const suspendedStudent = new User({
      name: 'Suspended Student',
      email: `sec.suspended.${timestamp}@university.edu`,
      passwordHash: await User.hashPassword(commonPassword),
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
      classSection: cohortA,
    });
    await suspendedStudent.save();
    suspendedStudentId = suspendedStudent.id;
    createdUserIds.push(suspendedStudentId);

    // 7. Create questionnaire & published version
    const rubric = new Questionnaire({
      title: 'Security Remediation Rubric',
      description: 'Used for testing rubric version access and submission cohort controls',
      category: 'General',
      questions: [
        {
          id: 'q_collab',
          order: 1,
          title: 'Collaboration & Teamwork',
          type: QuestionType.STAR_RATING,
          required: true,
          scaleMax: 5,
        },
      ],
      createdBy: adminUserId,
    });
    await rubric.save();
    testQuestionnaireId = rubric.id;
    createdQuestionnaireIds.push(testQuestionnaireId);

    const pubRes = await request(app)
      .post(`/api/admin/questionnaires/${rubric.id}/publish`)
      .set('Cookie', adminCookie)
      .send({ changeSummary: 'Release 1' });
    publishedVersionId = pubRes.body.publishedVersion.id;

    // 8. Create Open Feedback Round scoped strictly to Cohort A
    const round = new FeedbackRound({
      title: 'Cohort A Peer Review',
      questionnaireId: testQuestionnaireId,
      questionnaireVersionId: publishedVersionId,
      status: RoundStatus.OPEN,
      startDate: new Date(Date.now() - 3600000),
      deadline: new Date(Date.now() + 86400000),
      isAnonymous: true,
      allowSubmissionEdit: true,
      submissionsPerPeer: 2,
      feedbackVisibility: FeedbackVisibility.AFTER_DEADLINE,
      targetClass: cohortA,
      createdBy: adminUserId,
    });
    await round.save();
    testRoundId = round.id;
    createdRoundIds.push(testRoundId);
  });

  afterAll(async () => {
    try {
      if (createdRoundIds.length > 0) {
        await FeedbackSubmission.deleteMany({ roundId: { $in: createdRoundIds } });
        await FeedbackRound.deleteMany({ _id: { $in: createdRoundIds } });
      }
      if (createdQuestionnaireIds.length > 0) {
        await QuestionnaireVersion.deleteMany({
          questionnaireId: { $in: createdQuestionnaireIds },
        });
        await Questionnaire.deleteMany({ _id: { $in: createdQuestionnaireIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
    } finally {
      await disconnectDatabase();
    }
  });

  // =========================================================================
  // 1. Questionnaire Rubric Access
  // =========================================================================
  describe('Area 1: Questionnaire Rubric Access', () => {
    it('allows active student to fetch published rubric via /api/rounds/rubrics/versions/:versionId', async () => {
      const res = await request(app)
        .get(`/api/rounds/rubrics/versions/${publishedVersionId}`)
        .set('Cookie', cohortAStudent1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.version).toBeDefined();
      expect(res.body.version.id).toBe(publishedVersionId);
      expect(res.body.version.questions).toHaveLength(1);
    });

    it('allows active student to fetch round rubric via /api/rounds/:id/rubric', async () => {
      const res = await request(app)
        .get(`/api/rounds/${testRoundId}/rubric`)
        .set('Cookie', cohortAStudent1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.version).toBeDefined();
      expect(res.body.version.id).toBe(publishedVersionId);
    });

    it('rejects unauthenticated requests to /api/rounds/rubrics/versions/:versionId with 401', async () => {
      const res = await request(app).get(`/api/rounds/rubrics/versions/${publishedVersionId}`);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects pending student access to /api/rounds/rubrics/versions/:versionId with 403 MEMBERSHIP_PENDING', async () => {
      const res = await request(app)
        .get(`/api/rounds/rubrics/versions/${publishedVersionId}`)
        .set('Cookie', pendingStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('MEMBERSHIP_PENDING');
    });

    it('preserves admin authorization: denies student access to /api/admin/questionnaires/... with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get(`/api/admin/questionnaires/${testQuestionnaireId}/versions/${publishedVersionId}`)
        .set('Cookie', cohortAStudent1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 2. Submission Authorization & Cohort Integrity
  // =========================================================================
  describe('Area 2: Submission Authorization & Cohort Enforcement', () => {
    it('denies peer candidates listing to reviewer outside round cohort with 403 REVIEWER_NOT_ELIGIBLE', async () => {
      const res = await request(app)
        .get(`/api/rounds/${testRoundId}/peers`)
        .set('Cookie', cohortBStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('REVIEWER_NOT_ELIGIBLE');
    });

    it('rejects draft saving by reviewer outside round cohort with 403 REVIEWER_NOT_ELIGIBLE', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortBStudentCookie)
        .send({
          targetStudentId: cohortAStudent2Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('REVIEWER_NOT_ELIGIBLE');
    });

    it('rejects final submission by reviewer outside round cohort with 403 REVIEWER_NOT_ELIGIBLE', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions`)
        .set('Cookie', cohortBStudentCookie)
        .send({
          targetStudentId: cohortAStudent2Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('REVIEWER_NOT_ELIGIBLE');
    });

    it('rejects draft saving when target peer is outside the permitted cohort with 403 PEER_NOT_IN_COHORT', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortBStudentId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PEER_NOT_IN_COHORT');
    });

    it('rejects final submission when target peer is outside the permitted cohort with 403 PEER_NOT_IN_COHORT', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortBStudentId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PEER_NOT_IN_COHORT');
    });

    it('rejects target peer who is not a student (e.g. administrator) with 400 INVALID_TARGET_PEER', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: adminUserId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INVALID_TARGET_PEER');
    });

    it('rejects target peer who is suspended/inactive with 400 PEER_NOT_ACTIVE', async () => {
      const res = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: suspendedStudentId,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('PEER_NOT_ACTIVE');
    });

    it('allows legitimate draft saving and final submission within the same authorized cohort', async () => {
      // 1. Save draft
      const draftRes = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortAStudent2Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 3 },
          ],
        });

      expect(draftRes.status).toBe(200);
      expect(draftRes.body.success).toBe(true);
      expect(draftRes.body.data.status).toBe('draft');

      // 2. Finalize submission
      const finalRes = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortAStudent2Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
          ],
        });

      expect(finalRes.status).toBe(201);
      expect(finalRes.body.success).toBe(true);
      expect(finalRes.body.data.status).toBe('submitted');
    });

    it('allows explicitly rostered student to participate even when classSection differs from default targetClass', async () => {
      const rosteredRound = new FeedbackRound({
        title: 'Explicit Roster Cross-Section Round',
        questionnaireId: testQuestionnaireId,
        questionnaireVersionId: publishedVersionId,
        status: RoundStatus.OPEN,
        startDate: new Date(Date.now() - 3600000),
        deadline: new Date(Date.now() + 86400000),
        isAnonymous: true,
        allowSubmissionEdit: true,
        submissionsPerPeer: 1,
        feedbackVisibility: FeedbackVisibility.AFTER_DEADLINE,
        targetClass: 'CS-DEFAULT-CLASS',
        eligibleStudentIds: [cohortAStudent1Id, cohortBStudentId],
        createdBy: adminUserId,
      });
      await rosteredRound.save();
      createdRoundIds.push(rosteredRound.id);

      // Student B (classSection: cohortB !== 'CS-DEFAULT-CLASS') can access rubric
      const rubricRes = await request(app)
        .get(`/api/rounds/${rosteredRound.id}/rubric`)
        .set('Cookie', cohortBStudentCookie);
      expect(rubricRes.status).toBe(200);

      // Student B can view peer candidates (should see Student A1)
      const peersRes = await request(app)
        .get(`/api/rounds/${rosteredRound.id}/peers`)
        .set('Cookie', cohortBStudentCookie);
      expect(peersRes.status).toBe(200);
      expect(peersRes.body.data.candidates.some((c: any) => c.id === cohortAStudent1Id)).toBe(true);

      // Student B can save draft targeting Student A1
      const draftRes = await request(app)
        .post(`/api/rounds/${rosteredRound.id}/submissions/draft`)
        .set('Cookie', cohortBStudentCookie)
        .send({
          targetStudentId: cohortAStudent1Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 4 },
          ],
        });
      expect(draftRes.status).toBe(200);

      // Student B can finalize submission targeting Student A1
      const finalRes = await request(app)
        .post(`/api/rounds/${rosteredRound.id}/submissions`)
        .set('Cookie', cohortBStudentCookie)
        .send({
          targetStudentId: cohortAStudent1Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
          ],
        });
      expect(finalRes.status).toBe(201);
    });

    it('rejects student outside explicit roster even if student classSection matches round targetClass', async () => {
      const rosteredRound = new FeedbackRound({
        title: 'Strict Roster Round With Cohort A targetClass',
        questionnaireId: testQuestionnaireId,
        questionnaireVersionId: publishedVersionId,
        status: RoundStatus.OPEN,
        startDate: new Date(Date.now() - 3600000),
        deadline: new Date(Date.now() + 86400000),
        isAnonymous: true,
        allowSubmissionEdit: true,
        submissionsPerPeer: 1,
        feedbackVisibility: FeedbackVisibility.AFTER_DEADLINE,
        targetClass: cohortA,
        eligibleStudentIds: [cohortAStudent1Id], // Only A1 is on roster; A2 is in cohortA but NOT on roster
        createdBy: adminUserId,
      });
      await rosteredRound.save();
      createdRoundIds.push(rosteredRound.id);

      // Student A2 tries to access peers -> 403 REVIEWER_NOT_ELIGIBLE
      const peersRes = await request(app)
        .get(`/api/rounds/${rosteredRound.id}/peers`)
        .set('Cookie', cohortAStudent2Cookie);
      expect(peersRes.status).toBe(403);
      expect(peersRes.body.error?.code).toBe('REVIEWER_NOT_ELIGIBLE');

      // Student A1 tries to submit targeting A2 -> 403 PEER_NOT_IN_COHORT
      const subRes = await request(app)
        .post(`/api/rounds/${rosteredRound.id}/submissions`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortAStudent2Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
          ],
        });
      expect(subRes.status).toBe(403);
      expect(subRes.body.error?.code).toBe('PEER_NOT_IN_COHORT');
    });

    it('rejects self-evaluation attempts with 400 SELF_REVIEW_PROHIBITED', async () => {
      const selfDraftRes = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions/draft`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortAStudent1Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
          ],
        });
      expect(selfDraftRes.status).toBe(400);
      expect(selfDraftRes.body.error?.code).toBe('SELF_REVIEW_PROHIBITED');

      const selfSubmitRes = await request(app)
        .post(`/api/rounds/${testRoundId}/submissions`)
        .set('Cookie', cohortAStudent1Cookie)
        .send({
          targetStudentId: cohortAStudent1Id,
          responses: [
            { questionId: 'q_collab', questionType: QuestionType.STAR_RATING, rating: 5 },
          ],
        });
      expect(selfSubmitRes.status).toBe(400);
      expect(selfSubmitRes.body.error?.code).toBe('SELF_REVIEW_PROHIBITED');
    });
  });

  // =========================================================================
  // 3. Administrator Provisioning Secret Enforcement
  // =========================================================================
  describe('Area 3: Administrator Provisioning Secret Enforcement', () => {
    const configuredSecret = 'configured-secret-must-be-min-16chars';

    it('rejects verification when provided secret is missing or empty', () => {
      expect(verifyProvisioningSecret(undefined, configuredSecret)).toBe(false);
      expect(verifyProvisioningSecret('', configuredSecret)).toBe(false);
      expect(verifyProvisioningSecret(undefined, undefined)).toBe(false);
    });

    it('rejects verification when provided secret differs from configured secret', () => {
      expect(verifyProvisioningSecret('wrong-secret-token-16chars', configuredSecret)).toBe(false);
      expect(verifyProvisioningSecret(configuredSecret + '-extra', configuredSecret)).toBe(false);
    });

    it('accepts verification when provided secret matches configured secret exactly', () => {
      expect(verifyProvisioningSecret(configuredSecret, configuredSecret)).toBe(true);
    });

    it('parses explicit CLI arguments correctly without implicit default injection', () => {
      const parsedWithSecret = parseCliArgs([
        '--email',
        'admin@test.edu',
        '--secret',
        'my-secret-key-16chars',
      ]);
      expect(parsedWithSecret.email).toBe('admin@test.edu');
      expect(parsedWithSecret.secret).toBe('my-secret-key-16chars');

      const parsedWithoutSecret = parseCliArgs(['--email', 'admin@test.edu']);
      expect(parsedWithoutSecret.email).toBe('admin@test.edu');
      expect(parsedWithoutSecret.secret).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. Production Session Secret Rejection
  // =========================================================================
  describe('Area 4: Production Session Secret Enforcement', () => {
    it('rejects default dev session secret in NODE_ENV=production', () => {
      const prodWithDevSecret = {
        NODE_ENV: 'production',
        SESSION_SECRET: DEFAULT_DEV_SESSION_SECRET,
      };

      const result = envSchema.safeParse(prodWithDevSecret);
      expect(result.success).toBe(false);
      if (!result.success) {
        const secretError = result.error.issues.find((i) => i.path.includes('SESSION_SECRET'));
        expect(secretError).toBeDefined();
        expect(secretError?.message).toContain('Insecure production configuration');
      }
    });

    it('accepts custom session secret in NODE_ENV=production', () => {
      const prodWithCustomSecret = {
        NODE_ENV: 'production',
        SESSION_SECRET: 'production-strong-secret-key-must-be-32chars',
      };

      const result = envSchema.safeParse(prodWithCustomSecret);
      expect(result.success).toBe(true);
    });

    it('allows default dev session secret in NODE_ENV=development and NODE_ENV=test', () => {
      const devEnv = {
        NODE_ENV: 'development',
        SESSION_SECRET: DEFAULT_DEV_SESSION_SECRET,
      };
      const testEnv = {
        NODE_ENV: 'test',
        SESSION_SECRET: DEFAULT_DEV_SESSION_SECRET,
      };

      expect(envSchema.safeParse(devEnv).success).toBe(true);
      expect(envSchema.safeParse(testEnv).success).toBe(true);
    });
  });
});
