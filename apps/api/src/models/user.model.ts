import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@peerspace/shared';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  classSection?: string;
  studentId?: string;
  statusReason?: string;
  statusUpdatedAt?: Date;
  statusUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface UserModel extends Model<IUser, Record<string, never>, IUserMethods> {
  hashPassword(password: string): Promise<string>;
}

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      required: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'Computer Science',
      index: true,
    },
    classSection: {
      type: String,
      trim: true,
      default: 'CS-401',
      index: true,
    },
    studentId: {
      type: String,
      trim: true,
      sparse: true,
    },
    statusReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    statusUpdatedAt: {
      type: Date,
    },
    statusUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ role: 1, status: 1, classSection: 1 });
userSchema.index({ name: 'text', email: 'text' });

userSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
