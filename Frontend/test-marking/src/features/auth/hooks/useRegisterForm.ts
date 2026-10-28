import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { registerUser } from '@/api/endpoints/auth.api';
import { OtpType } from '@/types/auth.types';
import { handleApiError } from '@/lib/handleApiError';
import i18n from '@/i18n';

/**
 * Fields = RegisterRequest of the Spring backend:
 *   email, phoneNumber, password, firstName, lastName, dob (yyyy-MM-dd), gender, role.
 * confirmPassword exists only in the form.
 */
export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, i18n.t('auth.validation.firstNameRequired', { defaultValue: 'Vui lòng nhập tên' })),
    lastName: z.string().trim().min(1, i18n.t('auth.validation.lastNameRequired', { defaultValue: 'Vui lòng nhập họ' })),
    email: z
      .string()
      .min(1, i18n.t('auth.validation.emailRequired'))
      .email(i18n.t('auth.validation.emailInvalid')),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, i18n.t('auth.validation.phoneInvalid', { defaultValue: 'Số điện thoại không hợp lệ (9–15 chữ số)' })),
    dob: z
      .string()
      .min(1, i18n.t('auth.validation.dobRequired', { defaultValue: 'Vui lòng chọn ngày sinh' }))
      .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(), {
        message: i18n.t('auth.validation.dobInvalid', { defaultValue: 'Ngày sinh không hợp lệ' }),
      }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('auth.validation.passwordMin'),
        path: ['password'],
      });
    } else {
      if (!/[a-zA-Z]/.test(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i18n.t('auth.validation.passwordLetter'),
          path: ['password'],
        });
      }
      if (!/[0-9]/.test(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i18n.t('auth.validation.passwordDigit'),
          path: ['password'],
        });
      }
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('auth.validation.confirmMismatch'),
        path: ['confirmPassword'],
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function useRegisterForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dob: '',
      gender: 'MALE',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: values.email.trim(),
        phoneNumber: values.phoneNumber.trim(),
        password: values.password ?? '',
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dob: values.dob,
        gender: values.gender,
      });

      // The backend e-mailed a 6-digit code; the OTP page checks it with POST /user/verify-email.
      toast.success(i18n.t('auth.toasts.registerSuccess'));
      navigate('/otp-verification', {
        state: { email: values.email.trim(), type: OtpType.Register },
      });
    } catch (error) {
      handleApiError(error, i18n.t('auth.toasts.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
  };
}
