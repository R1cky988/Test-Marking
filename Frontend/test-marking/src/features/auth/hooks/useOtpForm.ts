import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { verifyOtp, requestOtp, verifyEmail, resendVerificationCode } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/store/useAuthStore';
import { OtpType } from '@/types/auth.types';
import { handleApiError } from '@/lib/handleApiError';
import { formatUserFacingMessage } from '@/lib/apiErrorMessage';
import i18n from '@/i18n';

const OTP_DURATION_SECONDS = 5 * 60; // 5 minutes

interface OtpLocationState {
  email: string;
  type: OtpType;
}

export function useOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const state = location.state as OtpLocationState | null;
  const email = state?.email ?? '';
  const type = state?.type ?? OtpType.Register;

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(OTP_DURATION_SECONDS);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = useCallback(() => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error(i18n.t('auth.toasts.otpIncomplete'));
      return;
    }

    if (!email) {
      toast.error(i18n.t('auth.toasts.otpEmailMissing'));
      navigate('/login');
      return;
    }

    if (type === OtpType.ForgotPassword) {
      navigate('/reset-password', {
        state: { email, otpCode: otp },
      });
      return;
    }

    setIsLoading(true);
    try {
      if (type === OtpType.Register) {
        // Spring: POST /user/verify-email activates the account and returns tokens -> sign in right away
        const authResponse = await verifyEmail({ email, code: otp });
        login(authResponse);
        toast.success(i18n.t('auth.toasts.welcome', { name: authResponse.user.fullName }));
        navigate('/dashboard', { state: { justLoggedIn: true } });
        return;
      }
      const response = await verifyOtp({ email, type, otpCode: otp });
      toast.success(formatUserFacingMessage(response.message || i18n.t('auth.toasts.otpVerified')));
      navigate('/login');
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.otpInvalid'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error(i18n.t('auth.toasts.otpEmailMissingStart'));
      navigate('/forgot-password');
      return;
    }

    setIsResending(true);
    try {
      if (type === OtpType.Register) await resendVerificationCode(email);
      else await requestOtp({ email, type });
      setCountdown(OTP_DURATION_SECONDS);
      setOtp('');
      toast.success(i18n.t('auth.toasts.otpResent'));
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.otpResendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  return {
    otp,
    setOtp,
    email,
    type,
    isLoading,
    isResending,
    countdown,
    formatCountdown,
    handleVerify,
    handleResend,
    canResend: countdown === 0,
  };
}
