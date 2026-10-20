import { z } from 'zod';
import { UserRole, UserStatus } from '../types/roles.js';

export const RegisterRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RegisterFormSchema = RegisterRequestSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserRoleSchema = z.enum([
  UserRole.STUDENT,
  UserRole.PEER_REVIEWER,
  UserRole.INSTRUCTOR,
  UserRole.ADMIN,
]);

export const UserStatusSchema = z.enum([
  UserStatus.PENDING,
  UserStatus.ACTIVE,
  UserStatus.REJECTED,
  UserStatus.SUSPENDED,
]);

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const AuthResponseSchema = z.object({
  message: z.string(),
  user: UserResponseSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
