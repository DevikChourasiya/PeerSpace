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

    it('denies access to protected membership routes for pending student with 403 MEMBERSHIP_PENDING', async () => {
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
});
