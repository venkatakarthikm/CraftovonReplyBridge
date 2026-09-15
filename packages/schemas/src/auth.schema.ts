// packages/schemas/src/auth.schema.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const UserRoleSchema = z.enum(['owner', 'admin', 'member']);
export const PlanKeySchema = z.enum(['free', 'starter', 'pro', 'agency']);

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  plan: PlanKeySchema,
  onboarding: z.object({
    tourDone: z.boolean(),
    checklist: z.array(z.string()),
  }),
  lastLoginAt: z.string().datetime().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type PlanKey = z.infer<typeof PlanKeySchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
