import { z } from 'zod';
import { UserRole, UserStatus } from '../types/roles.js';
import { UserResponseSchema } from './auth.js';

export const MembershipActionSchema = z.object({
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export type MembershipActionRequest = z.infer<typeof MembershipActionSchema>;

export const AdminStudentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum([UserRole.STUDENT, UserRole.PEER_REVIEWER, UserRole.INSTRUCTOR, UserRole.ADMIN]),
  status: z.enum([
    UserStatus.PENDING,
    UserStatus.ACTIVE,
    UserStatus.REJECTED,
    UserStatus.SUSPENDED,
  ]),
  createdAt: z.string().datetime().or(z.date()),
  statusReason: z.string().optional(),
  isEmailVerified: z.boolean().optional(),
});

export type AdminStudentItem = z.infer<typeof AdminStudentItemSchema>;

export const PendingStudentsResponseSchema = z.object({
  success: z.literal(true),
  count: z.number(),
  students: z.array(AdminStudentItemSchema),
});

export type PendingStudentsResponse = z.infer<typeof PendingStudentsResponseSchema>;

export const AdminMemberActionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  user: UserResponseSchema,
});

export type AdminMemberActionResponse = z.infer<typeof AdminMemberActionResponseSchema>;
