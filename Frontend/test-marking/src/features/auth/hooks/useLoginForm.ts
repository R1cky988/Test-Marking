import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { loginWithEmail } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/store/useAuthStore';
import { handleApiError } from '@/lib/handleApiError';
import i18n from '@/i18n';

// ---- Zod Schema ----
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, i18n.t('auth.validation.emailRequired'))
    .email(i18n.t('auth.validation.emailInvalid')),
  password: z
    .string()
    .min(8, i18n.t('auth.validation.passwordMin'))
    .regex(/[a-zA-Z]/, i18n.t('auth.validation.passwordLetter'))
    .regex(/[0-9]/, i18n.t('auth.validation.passwordDigit')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const authResponse = await loginWithEmail(values);
      login(authResponse);
      toast.success(i18n.t('auth.toasts.welcome', { name: authResponse.user.fullName }));
      navigate('/dashboard', { state: { justLoggedIn: true } });
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return { form, onSubmit: form.handleSubmit(onSubmit), isLoading };
}
