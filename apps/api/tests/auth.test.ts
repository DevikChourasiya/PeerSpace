import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { UserRole, UserStatus } from '@peerspace/shared';

describe('Authentication & Role-Based Access Control (Stage 2)', () => {
  const app = createApp();
  const createdUserIds: string[] = [];

  const timestamp = Date.now();
  const testStudentData = {
    name: 'Alex Rivera',
    email: `alex.student.${timestamp}@university.edu`,
    password: 'SecurePassword123!',
  };

  const testInstructorData = {
    name: 'Dr. Helen Vance',
    email: `helen.instructor.${timestamp}@university.edu`,
    password: 'ProfPassword2026!',
  };

  const testAdminData = {
    name: 'System Admin',
    email: `admin.${timestamp}@university.edu`,
    password: 'AdminPassword999!',
  };

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Surgically clean up only test users created during this test run
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectDatabase();
  });

  describe('1. Student Registration & Validation', () => {
    it('registers a new student with pending membership status by default', async () => {
      const res = await request(app).post('/api/auth/register').send(testStudentData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/pending approval/i);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe(testStudentData.name);
      expect(res.body.user.email).toBe(testStudentData.email.toLowerCase());
      expect(res.body.user.role).toBe(UserRole.STUDENT);
      expect(res.body.user.status).toBe(UserStatus.PENDING);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();

      createdUserIds.push(res.body.user.id);
    });

    it('rejects registration with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with weak password (missing number)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: `weak.${timestamp}@university.edu`,
          password: 'PasswordOnlyNoNum',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('prevents duplicate email registration (case-insensitive check)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate Student Attempt',
        email: testStudentData.email.toUpperCase(), // Test case insensitivity
        password: 'AnotherPassword456!',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(res.body.error.message).toMatch(/already exists/i);
    });

    it('trims leading/trailing whitespace and normalizes email casing upon registration', async () => {
      const unnormalizedEmail = `   Trimmed.User.${timestamp}@University.EDU   `;
      const expectedNormalized = `trimmed.user.${timestamp}@university.edu`;

      const res = await request(app).post('/api/auth/register').send({
        name: '   Whitespace Student   ',
        email: unnormalizedEmail,
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(expectedNormalized);
      expect(res.body.user.name).toBe('Whitespace Student');

      createdUserIds.push(res.body.user.id);
    });

    it('rejects email addresses containing internal whitespace or malformed syntax', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Whitespace Email',
        email: 'invalid email@university.edu',
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('never allows public registration to grant admin privileges or self-approve membership', async () => {
      const exploitData = {
        name: 'Privilege Escalation Attempt',
        email: `exploit.${timestamp}@university.edu`,
        password: 'ExploitPassword123!',
        role: 'admin',
        status: 'active',
      };

      const res = await request(app).post('/api/auth/register').send(exploitData);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(UserRole.STUDENT); // Forced to student
      expect(res.body.user.status).toBe(UserStatus.PENDING); // Forced to pending

      createdUserIds.push(res.body.user.id);

      // Verify directly in the database
      const dbUser = await User.findById(res.body.user.id);
      expect(dbUser?.role).toBe(UserRole.STUDENT);
      expect(dbUser?.status).toBe(UserStatus.PENDING);
    });

    it('properly hashes the password with bcrypt in MongoDB', async () => {
      const dbUser = await User.findOne({ email: testStudentData.email }).select('+passwordHash');
      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(testStudentData.password);
      expect(dbUser?.passwordHash.startsWith('$2')).toBe(true);

      // Verify comparePassword method
      const isMatch = await dbUser!.comparePassword(testStudentData.password);
      expect(isMatch).toBe(true);

      const isWrongMatch = await dbUser!.comparePassword('WrongPassword123!');
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('2. Login, Logout, and Session Management', () => {
    let sessionCookie: string;

    it('rejects login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testStudentData.email,
        password: 'IncorrectPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects login with nonexistent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'doesnotexist@university.edu',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('successfully logs in with valid credentials and sets session cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testStudentData.email,
        password: testStudentData.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testStudentData.email.toLowerCase());

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies!.some((c) => c.includes('peerspace.sid'))).toBe(true);

      sessionCookie = cookies!.find((c) => c.includes('peerspace.sid'))!;
    });

    it('GET /api/auth/me returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me returns authenticated user details with active session', async () => {
      const res = await request(app).get('/api/auth/me').set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe(testStudentData.name);
      expect(res.body.user.email).toBe(testStudentData.email.toLowerCase());
      expect(res.body.user.role).toBe(UserRole.STUDENT);
      expect(res.body.user.status).toBe(UserStatus.PENDING);
    });

    it('POST /api/auth/logout clears session and revokes access', async () => {
      const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', sessionCookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify that subsequent requests with that session cookie fail
      const meRes = await request(app).get('/api/auth/me').set('Cookie', sessionCookie);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Membership Approval and Role-Based Access Control', () => {
    let studentCookie: string;
    let instructorCookie: string;
    let adminCookie: string;
    let studentUserId: string;

    const getSessionCookie = (res: { headers: Record<string, any> }): string => {
      const raw = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
      return cookies.find((c) => c.includes('peerspace.sid')) || '';
    };

    beforeAll(async () => {
      // 1. Log in student
      const studentLoginRes = await request(app).post('/api/auth/login').send({
        email: testStudentData.email,
        password: testStudentData.password,
      });
      studentCookie = getSessionCookie(studentLoginRes);
      studentUserId = studentLoginRes.body.user.id;

      // 2. Create and login Instructor
      const instructorHash = await User.hashPassword(testInstructorData.password);
      const instructor = new User({
        name: testInstructorData.name,
        email: testInstructorData.email,
        passwordHash: instructorHash,
        role: UserRole.INSTRUCTOR,
        status: UserStatus.ACTIVE,
      });
      await instructor.save();
      createdUserIds.push(instructor.id);

      const instructorLoginRes = await request(app).post('/api/auth/login').send({
        email: testInstructorData.email,
        password: testInstructorData.password,
      });
      instructorCookie = getSessionCookie(instructorLoginRes);

      // 3. Create and login Admin
      const adminHash = await User.hashPassword(testAdminData.password);
      const admin = new User({
        name: testAdminData.name,
        email: testAdminData.email,
        passwordHash: adminHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      await admin.save();
      createdUserIds.push(admin.id);

      const adminLoginRes = await request(app).post('/api/auth/login').send({
        email: testAdminData.email,
        password: testAdminData.password,
      });
      adminCookie = getSessionCookie(adminLoginRes);
    });

    it('denies access to protected membership routes for pending unverified student with 403 EMAIL_NOT_VERIFIED', async () => {
      const res = await request(app).get('/api/auth/membership-test').set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body.error.message).toMatch(/verification required/i);
    });

    it('denies access to protected membership routes for pending verified student with 403 MEMBERSHIP_PENDING', async () => {
      await User.findByIdAndUpdate(studentUserId, { isEmailVerified: true });

      const res = await request(app).get('/api/auth/membership-test').set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MEMBERSHIP_PENDING');
      expect(res.body.error.message).toMatch(/pending approval/i);
    });

    it('grants access to protected membership routes once membership is approved to active', async () => {
      // Simulate instructor/admin approving the student
      await User.findByIdAndUpdate(studentUserId, { status: UserStatus.ACTIVE });

      const res = await request(app).get('/api/auth/membership-test').set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Active membership verified/i);
    });

    it('denies student access to instructor route with 403 FORBIDDEN', async () => {
      const res = await request(app).get('/api/auth/instructor-test').set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('grants instructor access to instructor route', async () => {
      const res = await request(app)
        .get('/api/auth/instructor-test')
        .set('Cookie', instructorCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe(UserRole.INSTRUCTOR);
    });

    it('denies instructor access to admin-only route with 403 FORBIDDEN', async () => {
      const res = await request(app).get('/api/auth/admin-test').set('Cookie', instructorCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('grants administrator access to admin-only route', async () => {
      const res = await request(app).get('/api/auth/admin-test').set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('4. Email Verification & Administrator Approval Account Lifecycle', () => {
    const lifecycleTime = Date.now();
    const candidateData = {
      name: 'Maya Lin',
      email: `maya.lifecycle.${lifecycleTime}@university.edu`,
      password: 'LifecyclePass2026!',
    };
    let candidateId: string;
    let candidateCookie: string;
    let candidateToken: string;

    it('handles registration email delivery failure with recoverable error (502)', async () => {
      const { setMockDeliveryFailure } = await import('../src/services/email.service.js');
      setMockDeliveryFailure(true);

      const failRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Delivery Failure User',
          email: `failure.${lifecycleTime}@university.edu`,
          password: 'Password123!',
        });

      expect(failRes.status).toBe(502);
      expect(failRes.body.error.code).toBe('EMAIL_DELIVERY_FAILED');

      // Ensure no dangling record was saved
      const userInDb = await User.findOne({ email: `failure.${lifecycleTime}@university.edu` });
      expect(userInDb).toBeNull();

      setMockDeliveryFailure(false);
    });

    it('registers candidate student and dispatches verification token', async () => {
      const { getLastSentEmail } = await import('../src/services/email.service.js');

      const res = await request(app).post('/api/auth/register').send(candidateData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isEmailVerified).toBe(false);
      expect(res.body.user.status).toBe(UserStatus.PENDING);

      candidateId = res.body.user.id;
      createdUserIds.push(candidateId);

      const sentEmail = getLastSentEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.to).toBe(candidateData.email.toLowerCase());
      expect(sentEmail?.token).toBeDefined();
      candidateToken = sentEmail!.token!;
    });

    it('blocks unverified candidate from protected student features with 403 EMAIL_NOT_VERIFIED', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: candidateData.email,
        password: candidateData.password,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.isEmailVerified).toBe(false);
      candidateCookie = (loginRes.headers['set-cookie'] as unknown as string[])[0];

      const accessRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', candidateCookie);

      expect(accessRes.status).toBe(403);
      expect(accessRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects administrator approval for unverified candidate with 400 EMAIL_NOT_VERIFIED', async () => {
      // Login admin
      const adminLoginRes = await request(app).post('/api/auth/login').send({
        email: testAdminData.email,
        password: testAdminData.password,
      });
      const currentAdminCookie = (adminLoginRes.headers['set-cookie'] as unknown as string[])[0];

      const approveRes = await request(app)
        .post(`/api/admin/memberships/${candidateId}/approve`)
        .set('Cookie', currentAdminCookie);

      expect(approveRes.status).toBe(400);
      expect(approveRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects ordinary student attempting to approve accounts with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/admin/memberships/${candidateId}/approve`)
        .set('Cookie', candidateCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('enforces 60-second cooldown rate limit on resending verification email', async () => {
      // First resend immediately succeeds
      // Wait: candidate was just registered, emailVerificationSentAt was just set!
      // So calling resend immediately should trigger rate limit 429
      const rateLimitRes = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: candidateData.email });

      expect(rateLimitRes.status).toBe(429);
      expect(rateLimitRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitRes.body.meta.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('rejects verification with an invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'definitely-invalid-and-malformed-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects verification with an expired token', async () => {
      // Backdate expiration in DB to simulate expired token
      await User.findByIdAndUpdate(candidateId, {
        emailVerificationExpires: new Date(Date.now() - 10000),
      });

      const res = await request(app).post('/api/auth/verify-email').send({ token: candidateToken });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');

      // Reset expiration back to future
      await User.findByIdAndUpdate(candidateId, {
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('verifies email successfully with valid token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({ token: candidateToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isEmailVerified).toBe(true);

      const dbCandidate = await User.findById(candidateId);
      expect(dbCandidate?.isEmailVerified).toBe(true);
      expect(dbCandidate?.emailVerificationTokenHash).toBeUndefined();
    });

    it('rejects single-use token reuse', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({ token: candidateToken });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects resending verification email for an already-verified user', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: candidateData.email });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_VERIFIED');
    });

    it('blocks verified candidate until administrator approves (403 MEMBERSHIP_PENDING)', async () => {
      // Candidate logs in with verified email
      const loginRes = await request(app).post('/api/auth/login').send({
        email: candidateData.email,
        password: candidateData.password,
      });
      const verifiedCookie = (loginRes.headers['set-cookie'] as unknown as string[])[0];

      const accessRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', verifiedCookie);

      expect(accessRes.status).toBe(403);
      expect(accessRes.body.error.code).toBe('MEMBERSHIP_PENDING');
    });

    it('allows administrator to approve the verified candidate', async () => {
      const adminLoginRes = await request(app).post('/api/auth/login').send({
        email: testAdminData.email,
        password: testAdminData.password,
      });
      const currentAdminCookie = (adminLoginRes.headers['set-cookie'] as unknown as string[])[0];

      const approveRes = await request(app)
        .post(`/api/admin/memberships/${candidateId}/approve`)
        .set('Cookie', currentAdminCookie);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.user.status).toBe(UserStatus.ACTIVE);
    });

    it('grants approved candidate full access to protected student features', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: candidateData.email,
        password: candidateData.password,
      });
      const approvedCookie = (loginRes.headers['set-cookie'] as unknown as string[])[0];

      const accessRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', approvedCookie);

      expect(accessRes.status).toBe(200);
      expect(accessRes.body.success).toBe(true);
      expect(accessRes.body.message).toMatch(/Active membership verified/i);
    });

    it('blocks suspended user from protected routes with 403 ACCOUNT_SUSPENDED', async () => {
      await User.findByIdAndUpdate(candidateId, { status: UserStatus.SUSPENDED });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: candidateData.email,
        password: candidateData.password,
      });
      const suspendedCookie = (loginRes.headers['set-cookie'] as unknown as string[])[0];

      const accessRes = await request(app)
        .get('/api/auth/membership-test')
        .set('Cookie', suspendedCookie);

      expect(accessRes.status).toBe(403);
      expect(accessRes.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });
});
