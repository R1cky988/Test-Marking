import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { Separator } from '@/components/ui/separator';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { loginWithGoogle } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/store/useAuthStore';
import { handleApiError } from '@/lib/handleApiError';
import { formatUserFacingMessage } from '@/lib/apiErrorMessage';
import { appConfig } from '@/config/env';
import { loadGoogleIdentityScript, parseGoogleIdTokenProfile } from '@/lib/googleIdentity';
import { useTranslation } from 'react-i18next';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { form, onSubmit, isLoading } = useLoginForm();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleGoogleCredential = useCallback(async (googleIdToken: string) => {
    const googleClientId = appConfig.googleClientId.trim();
    if (!googleClientId) {
      toast.error(t('auth.login.googleConfigMissing'));
      return;
    }

    setIsGoogleLoading(true);
    try {
      const authResponse = await loginWithGoogle({
        googleIdToken,
      });
      login(authResponse);
      navigate('/dashboard', { state: { justLoggedIn: true } });
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'GOOGLE_ACCOUNT_NOT_REGISTERED') {
          const profile = parseGoogleIdTokenProfile(googleIdToken);
          navigate('/register', {
            state: {
              googleIdToken,
              email: profile.email,
              fullName: profile.fullName,
            },
          });
          return;
        }
        if (errorCode === 'GOOGLE_ACCOUNT_WRONG_ROLE') {
          toast.error(t('auth.toasts.googleWrongRole'));
          return;
        }
        if (errorCode === 'GOOGLE_ACCOUNT_NOT_LINKED') {
          toast.error(t('auth.toasts.googleNotLinked'));
          return;
        }
        if (errorCode === 'GOOGLE_ACCOUNT_MISMATCH' || errorCode === 'GOOGLE_ACCOUNT_ALREADY_LINKED') {
          toast.error(t('auth.toasts.googleAccountConflict'));
          return;
        }
        handleApiError(error, t('auth.toasts.googleFailed'));
      } else if (error instanceof Error) {
        toast.error(formatUserFacingMessage(error.message));
      } else {
        toast.error(t('auth.toasts.googleFailed'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [login, navigate, t]);

  useEffect(() => {
    const googleClientId = appConfig.googleClientId.trim();
    const buttonContainer = googleButtonRef.current;

    if (!buttonContainer) return;
    if (!googleClientId) {
      buttonContainer.textContent = t('auth.login.googleConfigMissing');
      return;
    }

    let disposed = false;
    buttonContainer.innerHTML = '';

    loadGoogleIdentityScript()
      .then(() => {
        if (disposed || !window.google?.accounts?.id || !googleButtonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response: GoogleCredentialResponse) => {
            const token = response.credential?.trim();
            if (!token) {
              toast.error('Google did not return a valid ID token.');
              return;
            }

            void handleGoogleCredential(token);
          },
        });

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '360',
        });
      })
      .catch((error) => {
        if (disposed) return;
        const message = error instanceof Error ? error.message : t('auth.toasts.googleFailed');
        toast.error(formatUserFacingMessage(message));
      });

    return () => {
      disposed = true;
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
      }
    };
  }, [handleGoogleCredential, t]);

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

      {/* Divider */}
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          {t('auth.login.or')}
        </span>
      </div>

      {/* Google Login */}
      <div className="relative">
        <Button
          variant="outline"
          className="h-11 w-full gap-2"
          type="button"
          tabIndex={-1}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {isGoogleLoading ? t('auth.login.googleLoggingIn') : t('auth.login.googleLogin')}
        </Button>
        <div
          id="login-google-btn"
          ref={googleButtonRef}
          className={`absolute inset-0 overflow-hidden opacity-0 ${isGoogleLoading ? 'pointer-events-none' : ''}`}
        />
      </div>

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
