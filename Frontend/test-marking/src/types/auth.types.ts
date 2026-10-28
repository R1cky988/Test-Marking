// ============================================================
// Auth Types — Định nghĩa kiểu dữ liệu cho hệ thống Authentication
// ============================================================

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface User {
  id: string;           // UUID
  email: string;
  /** "firstName lastName" — built from the backend's two name fields */
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dob?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  isActive?: boolean;
  googleId?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
  user: User;
}

export interface RegisterResponse {
  message: string;
}

export interface OtpVerifyResponse {
  message: string;
  verified: boolean;
}

export enum OtpType {
  Register = 'register',
  ForgotPassword = 'forgot_password',
}

// ---- Request Payloads ----

export interface LoginEmailPayload {
  email: string;
  password: string;
}

export interface LoginGooglePayload {
  googleIdToken: string;
}

/** Body of POST /user/register (RegisterRequest in the backend) */
export interface RegisterPayload {
  email: string;
  phoneNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  /** yyyy-MM-dd */
  dob: string;
  gender: Gender;
}

export interface RequestOtpPayload {
  email: string;
  type: OtpType;
}

export interface VerifyOtpPayload {
  email: string;
  type: OtpType;
  otpCode: string;
}

export interface ForgotPasswordRequestPayload {
  email: string;
}

export interface ForgotPasswordConfirmPayload {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

// ---- API Error ----

export interface ApiErrorDetailObject {
  field?: string;
  message: string;
}

export type ApiErrorDetail = string | ApiErrorDetailObject;

export interface ApiErrorBody {
  error: {
    code?: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
