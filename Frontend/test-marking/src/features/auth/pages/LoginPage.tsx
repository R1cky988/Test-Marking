import { Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const { form, onSubmit, isLoading } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.login.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.login.email')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('auth.login.emailPlaceholder')}
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

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t('auth.login.password')}</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline underline-offset-4"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.login.passwordPlaceholder')}
                      className="pl-9 pr-9"
                      autoComplete="current-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            id="login-submit-btn"
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> {t('auth.login.submitting')}</>
            ) : (
              t('auth.login.submit')
            )}
          </Button>
        </form>
      </Form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:underline underline-offset-4">
          {t('auth.login.registerNow')}
        </Link>
      </p>
    </div>
  );
}
