import { z } from 'zod';
import { UserRole, UserStatus } from '../types/roles.js';

export const StudentDirectoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  department: z.string().optional(),
  classSection: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()),
});

export type StudentDirectoryItem = z.infer<typeof StudentDirectoryItemSchema>;

export const StudentDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().trim().optional(),
  classSection: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export type StudentDirectoryQuery = z.infer<typeof StudentDirectoryQuerySchema>;

export const StudentDirectoryResponseSchema = z.object({
  success: z.literal(true),
  students: z.array(StudentDirectoryItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().min(0),
});

export type StudentDirectoryResponse = z.infer<typeof StudentDirectoryResponseSchema>;
