import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { UserRole, UserStatus } from '@peerspace/shared';

describe('Administrator Membership Management & Approval APIs (Stage 4)', () => {
  const app = createApp();
  const createdUserIds: string[] = [];
  const timestamp = Date.now();

  let adminCookie: string;
  let adminUserId: string;

  let studentCookie: string;
  let studentUserId: string;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Create and log in Admin
    const adminPassword = 'AdminPassword123!';
    const adminHash = await User.hashPassword(adminPassword);
    const adminUser = new User({
      name: 'Super Admin',
      email: `stage4.admin.${timestamp}@university.edu`,
      passwordHash: adminHash,
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
    adminCookie = adminLoginRes.headers['set-cookie'].find((c: string) =>
      c.includes('peerspace.sid')
    );

    // 2. Create and log in regular Student
    const studentPassword = 'StudentPassword123!';
    const studentHash = await User.hashPassword(studentPassword);
    const studentUser = new User({
      name: 'Regular Student',
      email: `stage4.student.${timestamp}@university.edu`,
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    });
    await studentUser.save();
    studentUserId = studentUser.id;
    createdUserIds.push(studentUserId);

    const studentLoginRes = await request(app).post('/api/auth/login').send({
      email: studentUser.email,
      password: studentPassword,
    });
    studentCookie = studentLoginRes.headers['set-cookie'].find((c: string) =>
      c.includes('peerspace.sid')
    );
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectDatabase();
  });

  describe('1. Role Authorization & Access Control', () => {
    it('denies unauthenticated requests to list pending accounts with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/admin/memberships/pending');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies student access to list pending accounts with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/admin/memberships/pending')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies student access to approve accounts with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${studentUserId}/approve`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Pending Account Listing & Approval', () => {
    let pendingStudentId: string;
    let pendingStudentCookie: string;
    const pendingStudentEmail = `pending.applicant.${timestamp}@university.edu`;
    const pendingPassword = 'ApplicantPassword123!';

    beforeAll(async () => {
      // Register a pending student
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Pending Applicant',
        email: pendingStudentEmail,
        password: pendingPassword,
      });
      pendingStudentId = regRes.body.user.id;
      createdUserIds.push(pendingStudentId);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: pendingStudentEmail,
        password: pendingPassword,
      });
      pendingStudentCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.includes('peerspace.sid')
      );
    });

    it('returns pending students in list when requested by administrator', async () => {
      const res = await request(app)
        .get('/api/admin/memberships/pending')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.students)).toBe(true);

      const found = res.body.students.find((s: { id: string }) => s.id === pendingStudentId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Pending Applicant');
      expect(found.status).toBe(UserStatus.PENDING);
    });

    it('verifies pending student cannot access approved membership features before approval', async () => {
      const res = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', pendingStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBERSHIP_PENDING');
    });

    it('approves a pending student account successfully', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${pendingStudentId}/approve`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/approved successfully/i);
      expect(res.body.user.status).toBe(UserStatus.ACTIVE);

      // Verify in DB
      const dbUser = await User.findById(pendingStudentId);
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);
      expect(dbUser?.statusReason).toBe('Approved by administrator');
    });

    it('grants approved student access to membership-restricted features', async () => {
      const res = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', pendingStudentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects duplicate approval with 409 ACCOUNT_NOT_PENDING', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${pendingStudentId}/approve`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_NOT_PENDING');
    });
  });

  describe('3. Account Rejection', () => {
    let rejectStudentId: string;
    let rejectStudentCookie: string;
    const rejectEmail = `reject.candidate.${timestamp}@university.edu`;
    const rejectPassword = 'CandidatePassword123!';

    beforeAll(async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Rejected Candidate',
        email: rejectEmail,
        password: rejectPassword,
      });
      rejectStudentId = regRes.body.user.id;
      createdUserIds.push(rejectStudentId);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: rejectEmail,
        password: rejectPassword,
      });
      rejectStudentCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.includes('peerspace.sid')
      );
    });

    it('rejects a pending student registration with a reason', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${rejectStudentId}/reject`)
        .set('Cookie', adminCookie)
        .send({ reason: 'Not listed on official institutional course roster.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.status).toBe(UserStatus.REJECTED);

      // Verify in DB
      const dbUser = await User.findById(rejectStudentId);
      expect(dbUser?.status).toBe(UserStatus.REJECTED);
      expect(dbUser?.statusReason).toBe('Not listed on official institutional course roster.');
    });

    it('blocks rejected user from approved membership access with 403 MEMBERSHIP_REJECTED', async () => {
      const res = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', rejectStudentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBERSHIP_REJECTED');
    });

    it('refuses to re-reject a non-pending student account', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${rejectStudentId}/reject`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_NOT_PENDING');
    });
  });

  describe('4. Account Suspension & Safety Safeguards', () => {
    it('prevents an administrator from suspending their own account', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${adminUserId}/suspend`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_SUSPEND_SELF');
    });

    it('prevents suspending the last remaining active administrator', async () => {
      const secondAdminHash = await User.hashPassword('Password999!');
      const secondAdmin = new User({
        name: 'Second Admin',
        email: `second.admin.${timestamp}@university.edu`,
        passwordHash: secondAdminHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      await secondAdmin.save();
      createdUserIds.push(secondAdmin.id);

      // Spy on countDocuments to simulate that only 1 active admin exists in the system
      const countSpy = vi.spyOn(User, 'countDocuments').mockResolvedValueOnce(1);

      const res = await request(app)
        .post(`/api/admin/memberships/${secondAdmin.id}/suspend`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_SUSPEND_LAST_ADMIN');
      expect(res.body.error.message).toMatch(/remaining active administrator/i);

      countSpy.mockRestore();
    });

    it('suspends an active student account with reason', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${studentUserId}/suspend`)
        .set('Cookie', adminCookie)
        .send({ reason: 'Honor code violation investigation.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.status).toBe(UserStatus.SUSPENDED);

      // Verify student is now blocked
      const testRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', studentCookie);

      expect(testRes.status).toBe(403);
      expect(testRes.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('reactivates a suspended student account', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${studentUserId}/reactivate`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.status).toBe(UserStatus.ACTIVE);

      // Student can access membership route again
      const testRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', studentCookie);

      expect(testRes.status).toBe(200);
    });
  });
});
