import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Questionnaire } from '../src/models/questionnaire.model.js';
import { QuestionnaireVersion } from '../src/models/questionnaireVersion.model.js';
import { FeedbackRound } from '../src/models/feedbackRound.model.js';
import {
  UserRole,
  UserStatus,
  QuestionType,
  RoundStatus,
  QuestionnaireStatus,
} from '@peerspace/shared';

describe('Stage 5: Feedback Rounds, Questionnaire Builder & Student Directory', () => {
  const app = createApp();
  const timestamp = Date.now();
  const createdUserIds: string[] = [];
  const createdQuestionnaireIds: string[] = [];
  const createdRoundIds: string[] = [];
  const getSessionCookie = (res: { headers: Record<string, any> }): string => {
    const raw = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return cookies.find((c) => c.includes('peerspace.sid')) || '';
  };

  let adminCookie: string;
  let studentCookie: string;
  let pendingStudentCookie: string;

  let activeStudentId: string;
  let pendingStudentId: string;
  let testQuestionnaireId: string;
  let testPublishedVersionId: string;
  let testRoundId: string;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Create and authenticate Admin
    const adminEmail = `admin.stage5.${timestamp}@university.edu`;
    const adminPassword = 'AdminPassword123!';
    const regAdmin = await request(app).post('/api/auth/register').send({
      name: 'Dr. Stage5 Admin',
      email: adminEmail,
      password: adminPassword,
    });
    const adminId = regAdmin.body.user.id;
    createdUserIds.push(adminId);

    // Promote to Admin
    await User.findByIdAndUpdate(adminId, {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: adminPassword,
    });
    adminCookie = getSessionCookie(adminLogin);

    // 2. Create Active Student
    const studentEmail = `student.active.${timestamp}@university.edu`;
    const studentPassword = 'StudentPassword123!';
    const regStudent = await request(app).post('/api/auth/register').send({
      name: 'Alice Active',
      email: studentEmail,
      password: studentPassword,
    });
    activeStudentId = regStudent.body.user.id;
    createdUserIds.push(activeStudentId);

    // Approve student membership
    await User.findByIdAndUpdate(activeStudentId, {
      status: UserStatus.ACTIVE,
      classSection: 'CS-401',
      department: 'Computer Science',
    });

    const studentLogin = await request(app).post('/api/auth/login').send({
      email: studentEmail,
      password: studentPassword,
    });
    studentCookie = getSessionCookie(studentLogin);

    // 3. Create Pending Student (should be excluded from directory)
    const pendingEmail = `student.pending.${timestamp}@university.edu`;
    const pendingPassword = 'StudentPassword123!';
    const regPending = await request(app).post('/api/auth/register').send({
      name: 'Bob Pending',
      email: pendingEmail,
      password: pendingPassword,
    });
    pendingStudentId = regPending.body.user.id;
    createdUserIds.push(pendingStudentId);

    const pendingLogin = await request(app).post('/api/auth/login').send({
      email: pendingEmail,
      password: pendingPassword,
    });
    pendingStudentCookie = getSessionCookie(pendingLogin);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      if (createdQuestionnaireIds.length > 0) {
        await Questionnaire.deleteMany({ _id: { $in: createdQuestionnaireIds } });
        await QuestionnaireVersion.deleteMany({
          questionnaireId: { $in: createdQuestionnaireIds },
        });
      }
      if (createdRoundIds.length > 0) {
        await FeedbackRound.deleteMany({ _id: { $in: createdRoundIds } });
      }
    } finally {
      await disconnectDatabase();
    }
  });

  describe('1. Student Directory API', () => {
    it('denies unauthenticated access to student directory', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies pending members from viewing student directory', async () => {
      const res = await request(app).get('/api/students').set('Cookie', pendingStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBERSHIP_PENDING');
    });

    it('allows approved students to view directory with active students only', async () => {
      const res = await request(app).get('/api/students').set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.students)).toBe(true);

      // Verify that Alice Active is returned, but Bob Pending is NOT
      const studentEmails = res.body.students.map((s: { email: string }) => s.email);
      expect(studentEmails).toContain(`student.active.${timestamp}@university.edu`);
      expect(studentEmails).not.toContain(`student.pending.${timestamp}@university.edu`);
    });

    it('supports search query filtering by student name', async () => {
      const res = await request(app).get('/api/students?search=Alice').set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.students.some((s: { name: string }) => s.name.includes('Alice'))).toBe(true);
    });
  });

  describe('2. Versioned Questionnaire Builder API', () => {
    it('denies non-admin students from creating questionnaires', async () => {
      const res = await request(app)
        .post('/api/admin/questionnaires')
        .set('Cookie', studentCookie)
        .send({
          title: 'Unauthorized Questionnaire',
          questions: [],
        });

      expect(res.status).toBe(403);
    });

    it('creates a questionnaire in draft status', async () => {
      const res = await request(app)
        .post('/api/admin/questionnaires')
        .set('Cookie', adminCookie)
        .send({
          title: 'Peer Evaluation Rubric v1',
          description: 'Rubric for team collaboration and code quality.',
          category: 'Teamwork',
          questions: [
            {
              id: 'q1',
              order: 1,
              title: 'Team Communication',
              type: QuestionType.STAR_RATING,
              required: true,
              scaleMin: 1,
              scaleMax: 5,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.questionnaire.status).toBe(QuestionnaireStatus.DRAFT);
      expect(res.body.questionnaire.currentVersion).toBe(0);

      testQuestionnaireId = res.body.questionnaire.id;
      createdQuestionnaireIds.push(testQuestionnaireId);
    });

    it('rejects publishing a questionnaire with empty questions', async () => {
      // Clear questions
      await request(app)
        .put(`/api/admin/questionnaires/${testQuestionnaireId}`)
        .set('Cookie', adminCookie)
        .send({ questions: [] });

      const res = await request(app)
        .post(`/api/admin/questionnaires/${testQuestionnaireId}/publish`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('QUESTIONNAIRE_EMPTY');
    });

    it('rejects publishing choice questions with fewer than 2 options', async () => {
      await request(app)
        .put(`/api/admin/questionnaires/${testQuestionnaireId}`)
        .set('Cookie', adminCookie)
        .send({
          questions: [
            {
              id: 'q_invalid_choice',
              order: 1,
              title: 'Preferred Role',
              type: QuestionType.SINGLE_CHOICE,
              required: true,
              options: ['Frontend Only'], // Only 1 choice!
            },
          ],
        });

      const res = await request(app)
        .post(`/api/admin/questionnaires/${testQuestionnaireId}/publish`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUESTION_OPTIONS');
    });

    it('publishes valid questionnaire and generates immutable version v1', async () => {
      // Put valid multi-type questions
      await request(app)
        .put(`/api/admin/questionnaires/${testQuestionnaireId}`)
        .set('Cookie', adminCookie)
        .send({
          questions: [
            {
              id: 'q_star',
              order: 1,
              title: 'Technical Contributions',
              type: QuestionType.STAR_RATING,
              required: true,
              scaleMin: 1,
              scaleMax: 5,
            },
            {
              id: 'q_choice',
              order: 2,
              title: 'Primary Contribution Area',
              type: QuestionType.SINGLE_CHOICE,
              required: true,
              options: [
                'Architecture',
                'Frontend',
                'Backend & Database',
                'Testing & Documentation',
              ],
            },
            {
              id: 'q_text',
              order: 3,
              title: 'Constructive Qualitative Feedback',
              type: QuestionType.LONG_TEXT,
              required: true,
            },
          ],
        });

      const res = await request(app)
        .post(`/api/admin/questionnaires/${testQuestionnaireId}/publish`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questionnaire.status).toBe(QuestionnaireStatus.PUBLISHED);
      expect(res.body.questionnaire.currentVersion).toBe(1);
      expect(res.body.publishedVersion.versionNumber).toBe(1);

      testPublishedVersionId = res.body.publishedVersion.id;
    });

    it('verifies published version remains immutable when draft is edited', async () => {
      // Edit draft title and questions
      await request(app)
        .put(`/api/admin/questionnaires/${testQuestionnaireId}`)
        .set('Cookie', adminCookie)
        .send({
          title: 'Modified Draft Title',
          questions: [
            {
              id: 'q_draft_new',
              order: 1,
              title: 'New Working Draft Question',
              type: QuestionType.YES_NO,
              required: true,
            },
          ],
        });

      // Fetch the published version v1
      const res = await request(app)
        .get(`/api/admin/questionnaires/${testQuestionnaireId}/versions/${testPublishedVersionId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      // Published version retains original questions and title
      expect(res.body.version.title).toBe('Peer Evaluation Rubric v1');
      expect(res.body.version.questions.length).toBe(3);
    });

    it('duplicates questionnaire into a new draft', async () => {
      const res = await request(app)
        .post(`/api/admin/questionnaires/${testQuestionnaireId}/duplicate`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.questionnaire.title).toContain('(Copy)');
      expect(res.body.questionnaire.status).toBe(QuestionnaireStatus.DRAFT);
      createdQuestionnaireIds.push(res.body.questionnaire.id);
    });
  });

  describe('3. Feedback Round Management API', () => {
    it('creates a new feedback round in draft status', async () => {
      const startDate = new Date().toISOString();
      const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days later

      const res = await request(app).post('/api/admin/rounds').set('Cookie', adminCookie).send({
        title: 'Sprint 1 Peer Review Round',
        description: 'Evaluate your teammates for the Sprint 1 milestone.',
        questionnaireId: testQuestionnaireId,
        questionnaireVersionId: testPublishedVersionId,
        startDate,
        deadline,
        isAnonymous: true,
        targetClass: 'CS-401',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.round.status).toBe(RoundStatus.DRAFT);

      testRoundId = res.body.round.id;
      createdRoundIds.push(testRoundId);
    });

    it('rejects transitioning round to open if questionnaire version is missing', async () => {
      // Create round without questionnaire
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();

      const emptyRoundRes = await request(app)
        .post('/api/admin/rounds')
        .set('Cookie', adminCookie)
        .send({
          title: 'Round Without Questionnaire',
          startDate: start,
          deadline: end,
        });

      const emptyRoundId = emptyRoundRes.body.round.id;
      createdRoundIds.push(emptyRoundId);

      const res = await request(app)
        .post(`/api/admin/rounds/${emptyRoundId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: RoundStatus.OPEN });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('QUESTIONNAIRE_REQUIRED');
    });

    it('successfully transitions valid round from draft to open', async () => {
      const res = await request(app)
        .post(`/api/admin/rounds/${testRoundId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: RoundStatus.OPEN });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.round.status).toBe(RoundStatus.OPEN);
    });

    it('rejects invalid state transition (open to archived directly)', async () => {
      const res = await request(app)
        .post(`/api/admin/rounds/${testRoundId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: RoundStatus.ARCHIVED });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('allows student to list the active open round', async () => {
      const res = await request(app).get('/api/rounds').set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rounds.some((r: { id: string }) => r.id === testRoundId)).toBe(true);
    });

    it('returns progress stats without exposing anonymous respondent details', async () => {
      const res = await request(app)
        .get(`/api/admin/rounds/${testRoundId}/progress`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.progress.totalEligible).toBeGreaterThanOrEqual(1);
      // Ensure no respondent arrays or personal records leak in anonymous round progress
      expect(res.body.progress.respondents).toBeUndefined();
    });
  });
});
