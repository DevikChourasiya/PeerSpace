import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole, UserStatus, MembershipActionSchema, AuditAction } from '@peerspace/shared';
import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { logAuditEvent } from '../services/auditLog.service.js';

export const getPendingStudents = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const students = await User.find({
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
    })
      .select('name email role status isEmailVerified createdAt statusReason')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      students: students.map((student) => ({
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: student.role,
        status: student.status,
        isEmailVerified: student.isEmailVerified ?? false,
        createdAt: student.createdAt,
        statusReason: student.statusReason,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status && typeof req.query.status === 'string') {
      const statusVal = req.query.status.toLowerCase();
      if (Object.values(UserStatus).includes(statusVal as UserStatus)) {
        filter.status = statusVal;
      }
    }

    const members = await User.find(filter)
      .select('name email role status isEmailVerified createdAt updatedAt statusReason')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: members.length,
      members: members.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        isEmailVerified:
          m.isEmailVerified ?? (m.role === UserRole.ADMIN || m.status === UserStatus.ACTIVE),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        statusReason: m.statusReason,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const approveStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The supplied user ID is invalid.',
        },
      });
      return;
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user was not found.',
        },
      });
      return;
    }

    if (existingUser.status !== UserStatus.PENDING) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_PENDING',
          message: `Only pending accounts can be approved. Current status is "${existingUser.status}".`,
        },
      });
      return;
    }

    if (existingUser.role === UserRole.STUDENT && existingUser.isEmailVerified === false) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message:
            'Cannot approve student account because their university email address has not been verified.',
        },
      });
      return;
    }

    const adminId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    const approvedStudent = await User.findOneAndUpdate(
      {
        _id: id,
        status: UserStatus.PENDING,
      },
      {
        $set: {
          status: UserStatus.ACTIVE,
          statusUpdatedAt: new Date(),
          statusUpdatedBy: adminId,
          statusReason: 'Approved by administrator',
        },
      },
      { new: true, runValidators: true }
    );

    if (!approvedStudent) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_PENDING',
          message: 'This account has already been processed.',
        },
      });
      return;
    }

    await logAuditEvent({
      req,
      action: AuditAction.MEMBERSHIP_APPROVED,
      entityType: 'User',
      entityId: id,
      details: { studentEmail: approvedStudent.email, studentName: approvedStudent.name },
    });

    res.status(200).json({
      success: true,
      message: 'Student account approved successfully.',
      user: approvedStudent.toJSON(),
      student: approvedStudent.toJSON(), // backwards compatibility
    });
  } catch (error) {
    next(error);
  }
};

export const rejectStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The supplied user ID is invalid.',
        },
      });
      return;
    }

    const parseResult = MembershipActionSchema.safeParse(req.body);
    const reason =
      parseResult.success && parseResult.data.reason
        ? parseResult.data.reason
        : 'Registration declined by administrator';

    const existingUser = await User.findById(id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user was not found.',
        },
      });
      return;
    }

    if (existingUser.status !== UserStatus.PENDING) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_PENDING',
          message: `Only pending accounts can be rejected. Current status is "${existingUser.status}".`,
        },
      });
      return;
    }

    const adminId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    const rejectedUser = await User.findOneAndUpdate(
      {
        _id: id,
        status: UserStatus.PENDING,
      },
      {
        $set: {
          status: UserStatus.REJECTED,
          statusUpdatedAt: new Date(),
          statusUpdatedBy: adminId,
          statusReason: reason,
        },
      },
      { new: true, runValidators: true }
    );

    if (!rejectedUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_PENDING',
          message: 'This account has already been processed.',
        },
      });
      return;
    }

    await logAuditEvent({
      req,
      action: AuditAction.MEMBERSHIP_REJECTED,
      entityType: 'User',
      entityId: id,
      details: { studentEmail: rejectedUser.email, reason },
    });

    res.status(200).json({
      success: true,
      message: 'Student registration rejected.',
      user: rejectedUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The supplied user ID is invalid.',
        },
      });
      return;
    }

    // Rule: Prevent self-suspension
    if (req.user?.id === id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_SUSPEND_SELF',
          message: 'Administrators cannot suspend their own account.',
        },
      });
      return;
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user was not found.',
        },
      });
      return;
    }

    // Rule: Cannot suspend an already suspended account
    if (existingUser.status === UserStatus.SUSPENDED) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_ALREADY_SUSPENDED',
          message: 'This account is already suspended.',
        },
      });
      return;
    }

    // Rule: Prevent suspending the last remaining active administrator
    if (existingUser.role === UserRole.ADMIN) {
      const activeAdminCount = await User.countDocuments({
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      if (activeAdminCount <= 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_SUSPEND_LAST_ADMIN',
            message: 'Cannot suspend the only remaining active administrator in the system.',
          },
        });
        return;
      }
    }

    const parseResult = MembershipActionSchema.safeParse(req.body);
    const reason =
      parseResult.success && parseResult.data.reason
        ? parseResult.data.reason
        : 'Account suspended by administrator';

    const adminId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    existingUser.status = UserStatus.SUSPENDED;
    existingUser.statusReason = reason;
    existingUser.statusUpdatedAt = new Date();
    existingUser.statusUpdatedBy = adminId;

    await existingUser.save();

    await logAuditEvent({
      req,
      action: AuditAction.MEMBERSHIP_SUSPENDED,
      entityType: 'User',
      entityId: id,
      details: { email: existingUser.email, reason },
    });

    res.status(200).json({
      success: true,
      message: 'Account suspended successfully.',
      user: existingUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const reactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The supplied user ID is invalid.',
        },
      });
      return;
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user was not found.',
        },
      });
      return;
    }

    if (existingUser.status === UserStatus.ACTIVE) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_ALREADY_ACTIVE',
          message: 'This account is already active.',
        },
      });
      return;
    }

    const adminId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    existingUser.status = UserStatus.ACTIVE;
    existingUser.statusReason = 'Reactivated by administrator';
    existingUser.statusUpdatedAt = new Date();
    existingUser.statusUpdatedBy = adminId;

    await existingUser.save();

    await logAuditEvent({
      req,
      action: AuditAction.MEMBERSHIP_RESTORED,
      entityType: 'User',
      entityId: id,
      details: { email: existingUser.email },
    });

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully.',
      user: existingUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete an eligible suspended user.
 * Restricted to administrators; target user must be SUSPENDED; cannot delete self or last admin.
 * Destroys active sessions, preserves peer submission integrity, and logs audit trail.
 */
export const deleteSuspendedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The supplied user ID is invalid.',
        },
      });
      return;
    }

    // Rule: Prevent self-deletion
    if (req.user?.id === id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Administrators cannot delete their own account.',
        },
      });
      return;
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user was not found.',
        },
      });
      return;
    }

    // Rule: Only suspended accounts can be permanently deleted
    if (targetUser.status !== UserStatus.SUSPENDED) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_SUSPENDED',
          message: `Only suspended accounts can be permanently deleted. Current status is "${targetUser.status}".`,
        },
      });
      return;
    }

    // Rule: Prevent deleting the last remaining admin
    if (targetUser.role === UserRole.ADMIN) {
      const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_LAST_ADMIN',
            message: 'Cannot delete the only remaining administrator in the system.',
          },
        });
        return;
      }
    }

    // 1. Invalidate all active sessions for this user in MongoDB session store
    try {
      await mongoose.connection.collection('sessions').deleteMany({
        $or: [{ 'session.userId': id }, { session: { $regex: id } }],
      });
    } catch {
      // In-memory or custom session store in tests
    }

    // 2. Capture user snapshot for audit log before deletion
    const deletedUserInfo = {
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      status: targetUser.status,
    };

    // 3. Delete user document permanently
    await User.deleteOne({ _id: id });

    // 4. Log audit event
    await logAuditEvent({
      req,
      action: AuditAction.USER_DELETED,
      entityType: 'User',
      entityId: id,
      details: {
        deletedUserEmail: deletedUserInfo.email,
        deletedUserName: deletedUserInfo.name,
        deletedUserRole: deletedUserInfo.role,
        reason: 'Account permanently deleted by administrator',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Suspended user account permanently deleted.',
      deletedUser: {
        id,
        email: deletedUserInfo.email,
        name: deletedUserInfo.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns paginated, searchable administrator audit logs.
 */
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (req.query.entityType && typeof req.query.entityType === 'string') {
      query.entityType = req.query.entityType;
    }
    if (req.query.action && typeof req.query.action === 'string') {
      query.action = req.query.action;
    }
    if (
      req.query.actorId &&
      typeof req.query.actorId === 'string' &&
      mongoose.isValidObjectId(req.query.actorId)
    ) {
      query.actorId = req.query.actorId;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item._id.toString(),
          actorId: item.actorId?.toString() || '',
          actorEmail: item.actorEmail,
          actorRole: item.actorRole,
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          details: item.details || {},
          ip: item.ip,
          createdAt: item.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
