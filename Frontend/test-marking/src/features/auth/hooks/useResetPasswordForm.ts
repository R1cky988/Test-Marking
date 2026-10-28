import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { confirmForgotPassword } from '@/api/endpoints/auth.api';
import { handleApiError } from '@/lib/handleApiError';
import i18n from '@/i18n';

// ---- Zod Schema ----
export const resetPasswordSchema = z
  .object({
    otpCode: z.string().length(6, i18n.t('auth.validation.otpLength')),
    newPassword: z
      .string()
      .min(8, i18n.t('auth.validation.passwordMin'))
      .regex(/[a-zA-Z]/, i18n.t('auth.validation.passwordLetter'))
      .regex(/[0-9]/, i18n.t('auth.validation.passwordDigit')),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: i18n.t('auth.validation.confirmMismatch'),
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface LocationState {
  email: string;
  otpCode?: string;
}

export function useResetPasswordForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const email = locationState?.email ?? '';
  const presetOtpCode = locationState?.otpCode ?? '';
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otpCode: presetOtpCode,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!email) {
      toast.error(i18n.t('auth.toasts.passwordResetMissing'));
      navigate('/forgot-password');
      return;
    }

    setIsLoading(true);
    try {
      await confirmForgotPassword({
        email,
        otpCode: values.otpCode,
        newPassword: values.newPassword,
      });
      toast.success(i18n.t('auth.toasts.passwordResetSuccess'));
      navigate('/login');
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.passwordResetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return { form, onSubmit: form.handleSubmit(onSubmit), isLoading, email };
}
