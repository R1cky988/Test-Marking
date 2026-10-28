import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { requestForgotPassword } from '@/api/endpoints/auth.api';
import { OtpType } from '@/types/auth.types';
import { handleApiError } from '@/lib/handleApiError';
import i18n from '@/i18n';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, i18n.t('auth.validation.emailRequired'))
    .email(i18n.t('auth.validation.emailInvalid')),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function useForgotPasswordForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationEmail = (location.state as { email?: unknown } | null)?.email;
  const initialEmail = typeof locationEmail === 'string' ? locationEmail : '';
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const email = values.email.trim().toLowerCase();
    setIsLoading(true);
    try {
      await requestForgotPassword({ email });
      toast.success(i18n.t('auth.toasts.passwordResetOtpSent'));
      navigate('/otp-verification', {
        state: { email, type: OtpType.ForgotPassword },
      });
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.passwordResetRequestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return { form, onSubmit: form.handleSubmit(onSubmit), isLoading };
}
