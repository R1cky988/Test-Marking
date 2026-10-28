import { Link } from 'react-router';
import { Mail, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForgotPasswordForm } from '@/features/auth/hooks/useForgotPasswordForm';
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader';
import { AuthSubmitButton } from '@/features/auth/components/AuthSubmitButton';
import { useTranslation } from 'react-i18next';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { form, onSubmit, isLoading } = useForgotPasswordForm();

  return (
    <div className="w-full space-y-6">
      <AuthPageHeader
        icon={KeyRound}
        title={t('auth.forgotPassword.title')}
        subtitle={t('auth.forgotPassword.subtitle')}
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.forgotPassword.emailLabel')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="forgot-password-email"
                      type="email"
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                      className="pl-9"
                      autoComplete="email"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AuthSubmitButton
            id="forgot-password-submit-btn"
            isLoading={isLoading}
            label={t('auth.forgotPassword.submit')}
            loadingLabel={t('auth.forgotPassword.submitting')}
          />
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.forgotPassword.remembered')}{' '}
        <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
          {t('auth.forgotPassword.loginLink')}
        </Link>
      </p>
    </div>
  );
}
