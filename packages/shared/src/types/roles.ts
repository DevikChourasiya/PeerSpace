export const UserRole = {
  STUDENT: 'student',
  PEER_REVIEWER: 'peer_reviewer',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
