import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { UserRole, UserStatus, StudentDirectoryQuerySchema } from '@peerspace/shared';

/**
 * Escape special characters to prevent RegExp injection in MongoDB
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * List active, approved students in the student directory
 * Only approved members can view this list
 */
export const getStudentDirectory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = StudentDirectoryQuerySchema.safeParse(req.query);

    const queryData = parseResult.success
      ? parseResult.data
      : { page: 1, limit: 12, search: undefined, classSection: undefined, department: undefined };

    const page = queryData.page || 1;
    const limit = Math.min(queryData.limit || 12, 100);
    const skip = (page - 1) * limit;

    // Base filter: ONLY active, approved students
    const filter: Record<string, unknown> = {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    };

    if (queryData.classSection) {
      filter.classSection = queryData.classSection;
    }

    if (queryData.department) {
      filter.department = queryData.department;
    }

    if (queryData.search && queryData.search.trim()) {
      const sanitized = escapeRegex(queryData.search.trim());
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
        { department: { $regex: sanitized, $options: 'i' } },
        { classSection: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('name email role status department classSection createdAt')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      students: students.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        role: s.role,
        status: s.status,
        department: s.department || 'Computer Science',
        classSection: s.classSection || 'CS-401',
        createdAt: s.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};
