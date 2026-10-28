import { Link } from 'react-router';
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useResetPasswordForm } from '@/features/auth/hooks/useResetPasswordForm';
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader';
import { AuthSubmitButton } from '@/features/auth/components/AuthSubmitButton';
import { useTranslation } from 'react-i18next';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { form, onSubmit, isLoading, email } = useResetPasswordForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="w-full space-y-6">
      <AuthPageHeader
        icon={ShieldCheck}
        title={t('auth.resetPassword.title')}
        subtitle={
          <>
            {t('auth.resetPassword.subtitlePrefix')}{' '}
            <span className="font-medium text-foreground">
              {email || t('auth.forgotPassword.emailLabel')}
            </span>{' '}
            {t('auth.resetPassword.subtitleSuffix')}
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-5">
          {/* OTP Code */}
          <FormField
            control={form.control}
            name="otpCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.resetPassword.otpLabel')}</FormLabel>
                <FormDescription className="text-xs">
                  {t('auth.resetPassword.otpHint')}
                </FormDescription>
                <FormControl>
                  <InputOTP
                    id="reset-otp-input"
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New Password */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.resetPassword.newPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? t('auth.resetPassword.hidePassword') : t('auth.resetPassword.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.resetPassword.confirmPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? t('auth.resetPassword.hidePassword') : t('auth.resetPassword.showPassword')}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AuthSubmitButton
            id="reset-password-submit-btn"
            isLoading={isLoading}
            label={t('auth.resetPassword.submit')}
            loadingLabel={t('auth.resetPassword.submitting')}
          />
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.otp.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
