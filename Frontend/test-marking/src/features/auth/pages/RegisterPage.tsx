import { Link } from 'react-router';
import { User, Mail, Lock, Eye, EyeOff, Phone, CalendarDays, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useRegisterForm } from '@/features/auth/hooks/useRegisterForm';
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader';
import { AuthSubmitButton } from '@/features/auth/components/AuthSubmitButton';
import { useTranslation } from 'react-i18next';

export function RegisterPage() {
  const { t } = useTranslation();
  const { form, onSubmit, isLoading } = useRegisterForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="w-full space-y-6">
      <AuthPageHeader
        icon={UserPlus}
        title={t('auth.register.title')}
        subtitle={t('auth.register.subtitle')}
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Last name / first name (backend: lastName, firstName) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.lastName', { defaultValue: 'Họ' })}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="register-lastname"
                        placeholder={t('auth.register.lastNamePlaceholder', { defaultValue: 'Nguyễn' })}
                        className="pl-9"
                        autoComplete="family-name"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.firstName', { defaultValue: 'Tên' })}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="register-firstname"
                        placeholder={t('auth.register.firstNamePlaceholder', { defaultValue: 'Văn A' })}
                        className="pl-9"
                        autoComplete="given-name"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.register.email')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder={t('auth.register.emailPlaceholder')}
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

          {/* Phone (backend: phoneNumber, unique) */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.register.phoneNumber', { defaultValue: 'Số điện thoại' })}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder={t('auth.register.phoneNumberPlaceholder', { defaultValue: '0912345678' })}
                      className="pl-9"
                      autoComplete="tel"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date of birth + gender */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.dob', { defaultValue: 'Ngày sinh' })}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="register-dob"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className="pl-9"
                        autoComplete="bday"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.gender', { defaultValue: 'Giới tính' })}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger id="register-gender">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">{t('auth.register.genderMale', { defaultValue: 'Nam' })}</SelectItem>
                      <SelectItem value="FEMALE">{t('auth.register.genderFemale', { defaultValue: 'Nữ' })}</SelectItem>
                      <SelectItem value="OTHER">{t('auth.register.genderOther', { defaultValue: 'Khác' })}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.register.password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.register.passwordPlaceholder')}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
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
                <FormLabel>{t('auth.register.confirmPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t('auth.register.confirmPasswordPlaceholder')}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
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
            id="register-submit-btn"
            isLoading={isLoading}
            label={t('auth.register.submit')}
            loadingLabel={t('auth.register.submitting')}
          />
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </div>
  );
}
