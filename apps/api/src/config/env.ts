import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from workspace root if present, or current working dir
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const DEFAULT_DEV_SESSION_SECRET = 'development-session-secret-change-in-production-32chars';

export const envSchema = z
  .object({
    PORT: z
      .string()
      .optional()
      .default('5001')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive().max(65535)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/peerspace_feedback'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    SESSION_SECRET: z
      .string()
      .min(16, 'SESSION_SECRET must be at least 16 characters long')
      .default(DEFAULT_DEV_SESSION_SECRET),
    ADMIN_PROVISION_SECRET: z
      .string()
      .min(16, 'ADMIN_PROVISION_SECRET must be at least 16 characters long')
      .optional()
      .default('development-admin-provision-secret-32chars'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .default('587')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number()),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('PeerSpace <no-reply@peerspace.edu>'),
    APP_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && data.SESSION_SECRET === DEFAULT_DEV_SESSION_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message:
          'Insecure production configuration: SESSION_SECRET must not use the default development secret in production mode.',
      });
    }
  });

export const parseEnv = (rawEnv: Record<string, unknown> = process.env) => {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error('❌ Invalid environment variable configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment variable validation failed');
  }

  return result.data;
};

export const env = parseEnv();
export type Environment = z.infer<typeof envSchema>;
