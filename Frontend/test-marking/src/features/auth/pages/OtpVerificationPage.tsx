import { Link } from 'react-router';
import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useOtpForm } from '@/features/auth/hooks/useOtpForm';
import { useTranslation } from 'react-i18next';

export function OtpVerificationPage() {
  const { t } = useTranslation();
  const {
    otp,
    setOtp,
    email,
    isLoading,
    isResending,
    formatCountdown,
    handleVerify,
    handleResend,
    canResend,
  } = useOtpForm();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.otp.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.otp.subtitle')}{' '}
          <span className="font-medium text-foreground">{email || t('auth.forgotPassword.emailLabel')}</span>.
          {t('auth.otp.checkInbox')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('auth.otp.forgotNote')}
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex flex-col items-center gap-4">
        <InputOTP
          id="otp-input"
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={isLoading}
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

        {/* Countdown */}
        {!canResend && (
          <p className="text-sm text-muted-foreground">
            {t('auth.otp.expiresIn')}{' '}
            <span className="font-mono font-medium text-foreground tabular-nums">
              {formatCountdown()}
            </span>
          </p>
        )}
      </div>

      {/* Verify Button */}
      <Button
        id="otp-verify-btn"
        className="w-full"
        onClick={handleVerify}
        disabled={isLoading || otp.length < 6}
      >
        {isLoading ? (
          <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> {t('auth.otp.verifying')}</>
        ) : (
          t('auth.otp.verify')
        )}
      </Button>

      {/* Resend */}
      <div className="text-center">
        {canResend ? (
          <Button
            id="otp-resend-btn"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="gap-2"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t('auth.otp.resend')}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('auth.otp.resendWait')}{' '}
            <span className="text-muted-foreground/60">{t('auth.otp.resendAfter', { time: formatCountdown() })}</span>
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
          ← {t('auth.otp.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
