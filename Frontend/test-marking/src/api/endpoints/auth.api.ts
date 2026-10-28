import axiosClient from '@/api/axiosClient';
import { extractTokens, normalizeSpringError, toAuthResponse, toProfile } from '@/api/spring';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  AuthResponse,
  LoginEmailPayload,
  LoginGooglePayload,
  RegisterPayload,
  RequestOtpPayload,
  VerifyOtpPayload,
  OtpVerifyResponse,
  RegisterResponse,
  ForgotPasswordRequestPayload,
  ForgotPasswordConfirmPayload,
  RefreshTokenPayload,
} from '@/types/auth.types';

// ============================================================
// Auth API Services
// ============================================================

/**
 * Đăng nhập bằng Email/Mật khẩu — Spring backend
 * POST /api/v1/user/login  then  GET /api/v1/user/me  (the login answer has tokens only)
 */
export async function loginWithEmail(payload: LoginEmailPayload): Promise<AuthResponse> {
  try {
    const login = await axiosClient.post('/user/login', payload);
    const tokens = extractTokens(login.data);
    // the store is not updated yet, so send the new token by hand
    const me = await axiosClient.get('/user/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    return toAuthResponse(tokens, me.data.data);
  } catch (error) {
    throw normalizeSpringError(error, 'Email hoặc mật khẩu không đúng');
  }
}

/**
 * Đăng nhập bằng Google OAuth
 * POST /api/v1/auth/login/google
 */
export async function loginWithGoogle(payload: LoginGooglePayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/auth/login/google', payload);
  return data;
}

/**
 * Đăng xuất — the Spring backend has no logout endpoint (stateless JWT); the caller clears the store.
 */
export async function logout(): Promise<void> {
  return;
}

/**
 * Đăng ký tài khoản (giáo viên hoặc học sinh) — Spring backend
 * POST /api/v1/user/register  (RegisterRequest). The backend then e-mails a 6-digit code.
 */
export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const { data } = await axiosClient.post('/user/register', payload);
    return { message: data?.message ?? 'Register successfully' };
  } catch (error) {
    throw normalizeSpringError(error, 'Đăng ký thất bại');
  }
}

/**
 * Xác thực email bằng mã 6 số, rồi đăng nhập luôn
 * POST /api/v1/user/verify-email { email, code } -> tokens, then GET /user/me
 */
export async function verifyEmail(payload: { email: string; code: string }): Promise<AuthResponse> {
  try {
    const verified = await axiosClient.post('/user/verify-email', payload);
    const tokens = extractTokens(verified.data);
    const me = await axiosClient.get('/user/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    return toAuthResponse(tokens, me.data.data);
  } catch (error) {
    throw normalizeSpringError(error, 'Mã xác thực không đúng');
  }
}

/**
 * Gửi lại mã xác thực email
 * POST /api/v1/user/resend-code { email }
 */
export async function resendVerificationCode(email: string): Promise<{ message: string }> {
  try {
    const { data } = await axiosClient.post('/user/resend-code', { email });
    return { message: data?.message ?? '' };
  } catch (error) {
    throw normalizeSpringError(error, 'Không gửi lại được mã');
  }
}

/**
 * Yêu cầu gửi mã OTP
 * POST /api/v1/auth/otp/request
 */
export async function requestOtp(payload: RequestOtpPayload): Promise<{ message: string }> {
  const { data } = await axiosClient.post<{ message: string }>(
    '/auth/otp/request',
    payload
  );
  return data;
}

/**
 * Xác thực mã OTP
 * POST /api/v1/auth/otp/verify
 */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<OtpVerifyResponse> {
  const { data } = await axiosClient.post<OtpVerifyResponse>('/auth/otp/verify', payload);
  return data;
}

/**
 * Yêu cầu đặt lại mật khẩu (gửi OTP về email)
 * POST /api/v1/auth/forgot-password/request
 */
export async function requestForgotPassword(
  payload: ForgotPasswordRequestPayload
): Promise<{ message: string }> {
  const { data } = await axiosClient.post<{ message: string }>(
    '/auth/forgot-password/request',
    payload
  );
  return data;
}

/**
 * Xác nhận đặt lại mật khẩu với OTP
 * POST /api/v1/auth/forgot-password/confirm
 */
export async function confirmForgotPassword(
  payload: ForgotPasswordConfirmPayload
): Promise<{ message: string }> {
  const { data } = await axiosClient.post<{ message: string }>(
    '/auth/forgot-password/confirm',
    payload
  );
  return data;
}

/**
 * Làm mới Access Token
 * POST /api/v1/user/refresh   body { refreshToken }
 */
export async function refreshAuthToken(payload: RefreshTokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await axiosClient.post('/user/refresh', { refreshToken: payload.refreshToken });
  return extractTokens(data);
}

/** What GET /user/me returns, shaped for the settings page (see toProfile in api/spring.ts) */
export interface AuthProfile {
  id: string;
  email: string;
  /** "firstName lastName" */
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dob?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Not provided by the Spring backend yet — the Google / password-setup parts of the settings page read them.
  googleId?: string | null;
  mustChangePassword?: boolean;
  googleLinked?: boolean;
  hasPassword?: boolean;
}

export interface AuthSession {
  id: string;
  deviceId: string;
  fcmToken?: string | null;
  appVersion?: string | null;
  lastActive?: string | null;
  createdAt?: string | null;
}

export async function getProfile(): Promise<AuthProfile> {
  const { data } = await axiosClient.get('/user/me');
  return toProfile(data.data);
}

/**
 * PUT /api/v1/user/update-profile  { email?, phoneNumber?, firstName?, lastName? }
 * The backend answers with NEW tokens (the token subject is the e-mail), so they are stored before the profile is re-read.
 */
export async function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
}): Promise<AuthProfile> {
  try {
    const { data } = await axiosClient.put('/user/update-profile', payload);
    useAuthStore.getState().setTokens(extractTokens(data));
    return await getProfile();
  } catch (error) {
    throw normalizeSpringError(error, 'Không cập nhật được hồ sơ');
  }
}

export async function uploadAvatar(file: File): Promise<AuthProfile> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post<AuthProfile>('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export interface GoogleLinkResult {
  data: {
    google_linked: boolean;
    updated: boolean;
  };
}

export async function linkGoogleAccount(googleIdToken: string): Promise<GoogleLinkResult> {
  const { data } = await axiosClient.post<GoogleLinkResult>('/auth/me/google-link', {
    google_id_token: googleIdToken,
  });
  return data;
}

export async function unlinkGoogleAccount(): Promise<GoogleLinkResult> {
  const { data } = await axiosClient.delete<GoogleLinkResult>('/auth/me/google-link');
  return data;
}

/** PUT /api/v1/user/update-password  { oldPassword, newPassword } */
export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  try {
    const { data } = await axiosClient.put('/user/update-password', {
      oldPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
    return { message: data?.message ?? '' };
  } catch (error) {
    throw normalizeSpringError(error, 'Không đổi được mật khẩu');
  }
}

export async function getSessions(): Promise<AuthSession[]> {
  const { data } = await axiosClient.get<AuthSession[]>('/auth/sessions');
  return data;
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  const { data } = await axiosClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
  return data;
}

export interface NotificationPreferences {
  inAppSubmissions: boolean;
  inAppAppeals: boolean;
  inAppExamFinished: boolean;
  inAppViolations: boolean;
  inAppClassActivity: boolean;
  emailSubmissions: boolean;
  emailAppeals: boolean;
  emailExamFinished: boolean;
  emailViolations: boolean;
  emailClassActivity: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await axiosClient.get<{ data: NotificationPreferences }>(
    '/auth/notification-preferences',
  );
  return data.data;
}

export async function updateNotificationPreferences(
  payload: NotificationPreferences,
): Promise<NotificationPreferences> {
  const { data } = await axiosClient.patch<{ data: NotificationPreferences }>(
    '/auth/notification-preferences',
    payload,
  );
  return data.data;
}
