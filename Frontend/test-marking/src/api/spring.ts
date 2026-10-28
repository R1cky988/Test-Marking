
import { AxiosError } from 'axios';
import type { AuthResponse, User, UserRole } from '@/types/auth.types';

interface SpringTokens {
  AccessToken?: string;
  RefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

/** UserResponse of GET /user/me */
export interface SpringUser {
  uuid: string;
  email: string;
  phoneNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  gender?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function extractTokens(body: { data?: SpringTokens | null } | undefined): { accessToken: string; refreshToken: string } {
  const d = body?.data;
  const accessToken = d?.AccessToken ?? d?.accessToken;
  const refreshToken = d?.RefreshToken ?? d?.refreshToken;
  if (!accessToken || !refreshToken) throw new Error('Phản hồi đăng nhập không có token');
  return { accessToken, refreshToken };
}

export function toUser(raw: SpringUser): User {
  // same order as the backend's displayName: "first last"
    const fullName = [raw.lastName, raw.firstName].filter(Boolean).join(' ').trim() || raw.email;  return {
    id: raw.uuid,
    email: raw.email,
    fullName,
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    phoneNumber: raw.phoneNumber ?? '',
    dob: raw.dob ?? null,
    gender: raw.gender ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    role: String(raw.role ?? 'USER').toUpperCase() as UserRole,
    isActive: true,
  };
}

/** Profile shown on the account settings page (GET /user/me) */
export function toProfile(raw: SpringUser) {
  const user = toUser(raw);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phoneNumber: user.phoneNumber ?? '',
    dob: user.dob ?? null,
    gender: user.gender ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role as string,
    isActive: true,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}

export function toAuthResponse(tokens: { accessToken: string; refreshToken: string }, user: SpringUser): AuthResponse {
  return { ...tokens, user: toUser(user) };
}

/**
 * The UI reads errors as { error: { code, message } } (what the template / class endpoints send).
 * /user/* answers { status: 0, message } instead; rewrite it so handleApiError can show the message.
 */
export function normalizeSpringError(error: unknown, fallbackMessage: string): unknown {
  if (error instanceof AxiosError && error.response) {
    const data = error.response.data as { message?: string; error?: unknown } | undefined;
    if (!data?.error) {
      const raw = data?.message;
      const message = !raw || /bad credentials/i.test(raw) ? fallbackMessage : raw;
      error.response.data = { error: { code: 'AUTH_ERROR', message } };
    }
  }
  return error;
}
