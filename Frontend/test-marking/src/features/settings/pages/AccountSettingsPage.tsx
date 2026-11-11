import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Languages,
  Laptop,
  Loader2,
  LockKeyhole,
  Mail,
  Moon,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import {
  changePassword,
  getProfile,
  getSessions,
  revokeSession,
  updateProfile,
  uploadAvatar,
  type AuthProfile,
  type AuthSession,
} from "@/api/endpoints/auth.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { useAuthStore } from "@/store/useAuthStore";
import { getDeviceId } from "@/lib/device";

type SettingsSection = "profile" | "security" | "preferences";

// Fields of the backend's UpdateUserRequest (email is shown read-only: it is the login name)
type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

type DisplayPreferences = {
  language: "vi" | "en";
  theme: "light" | "dark" | "system";
};

const preferenceStorageKey = "teacher_settings_preferences";

const sections: Array<{
  id: SettingsSection;
  titleKey: "sectionProfileTitle" | "sectionSecurityTitle" | "sectionPreferencesTitle";
  descriptionKey:
    | "sectionProfileDesc"
    | "sectionSecurityDesc"
    | "sectionPreferencesDesc";
  icon: typeof UserRound;
}> = [
  {
    id: "profile",
    titleKey: "sectionProfileTitle",
    descriptionKey: "sectionProfileDesc",
    icon: UserRound,
  },
  {
    id: "security",
    titleKey: "sectionSecurityTitle",
    descriptionKey: "sectionSecurityDesc",
    icon: LockKeyhole,
  },
  {
    id: "preferences",
    titleKey: "sectionPreferencesTitle",
    descriptionKey: "sectionPreferencesDesc",
    icon: Sun,
  },
];


const defaultDisplayPreferences: DisplayPreferences = {
  language: "vi",
  theme: "light",
};

function getInitials(name: string, fallback = "GV") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || fallback
  );
}

function loadStoredPreferences(): DisplayPreferences {
  try {
    const raw = localStorage.getItem(preferenceStorageKey);
    if (!raw) return defaultDisplayPreferences;
    const parsed = JSON.parse(raw);
    return { ...defaultDisplayPreferences, ...parsed.display };
  } catch {
    return defaultDisplayPreferences;
  }
}

function formatDateTime(value?: string | null, locale = "vi-VN") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string, locale = "vi-VN") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function genderLabel(value?: string | null) {
  switch ((value ?? "").toUpperCase()) {
    case "MALE":
      return "Nam";
    case "FEMALE":
      return "Nữ";
    case "OTHER":
      return "Khác";
    default:
      return value || "-";
  }
}

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  // Refs and states for avatar cropping
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [sessionPendingRevoke, setSessionPendingRevoke] = useState<AuthSession | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [displayPreferences, setDisplayPreferences] = useState<DisplayPreferences>(loadStoredPreferences);

  const language = i18n.language === "en" ? "en" : "vi";
  const locale = language === "en" ? "en-US" : "vi-VN";

  const displayName = profile?.fullName || user?.fullName || t("settings.teacherFallback");
  const avatarUrl = resolveServerImageUrl(profile?.avatarUrl || user?.avatarUrl);
  const initials = getInitials(displayName, t("settings.initialsFallback"));
  const hasPassword = profile?.hasPassword ?? true;
  const currentDeviceId = getDeviceId();
  const profileFormChanged = Boolean(
    profile &&
      (
        profileForm.firstName.trim() !== (profile.firstName || "") ||
        profileForm.lastName.trim() !== (profile.lastName || "") ||
        profileForm.phoneNumber.trim() !== (profile.phoneNumber || "")
      ),
  );

  useEffect(() => {
    if (theme !== "light" && theme !== "dark" && theme !== "system") return;
    setDisplayPreferences((current) =>
      current.theme === theme ? current : { ...current, theme },
    );
  }, [theme]);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        const response = await getProfile();
        if (!isActive) return;
        setProfile(response);
        setProfileForm((current) => ({
          ...current,
          firstName: response.firstName || "",
          lastName: response.lastName || "",
          email: response.email || "",
          phoneNumber: response.phoneNumber || "",
        }));
      } catch (error) {
        if (isActive) toast.error(getApiErrorMessage(error, t("settings.profileLoadError")));
      } finally {
        if (isActive) setIsLoadingProfile(false);
      }
    }

    async function loadSessions() {
      try {
        setIsLoadingSessions(true);
        const response = await getSessions();
        if (isActive) setSessions(response);
      } catch {
        if (isActive) setSessions([]);
      } finally {
        if (isActive) setIsLoadingSessions(false);
      }
    }

    void loadProfile();
    void loadSessions();
    return () => {
      isActive = false;
    };
  }, [language]);

  function savePreferences(nextDisplay = displayPreferences) {
    try {
      localStorage.setItem(preferenceStorageKey, JSON.stringify({ display: nextDisplay }));
    } catch {
      // storage can be blocked (private window); the setting still applies for this session
    }
  }

  function handleProfileCancel() {
    setProfileForm({
      firstName: profile?.firstName || user?.firstName || "",
      lastName: profile?.lastName || user?.lastName || "",
      email: profile?.email || user?.email || "",
      phoneNumber: profile?.phoneNumber || user?.phoneNumber || "",
    });
  }

  async function handleProfileSave() {
    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const phoneNumber = profileForm.phoneNumber.trim();
    if (!firstName || !lastName) {
      toast.error(t("settings.profileNameRequired"));
      return;
    }
    if (firstName.length > 100 || lastName.length > 100) {
      toast.error(t("settings.profileNameTooLong"));
      return;
    }
    if (!/^\+?[0-9]{9,15}$/.test(phoneNumber)) {
      toast.error(t("settings.profilePhoneInvalid", { defaultValue: "Số điện thoại không hợp lệ (9–15 chữ số)" }));
      return;
    }

    try {
      setIsSavingProfile(true);
      const updated = await updateProfile({ firstName, lastName, phoneNumber });
      setProfile(updated);
      setProfileForm((current) => ({
        ...current,
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        email: updated.email || current.email,
        phoneNumber: updated.phoneNumber || "",
      }));
      if (user) {
        setUser({
          ...user,
          fullName: updated.fullName,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phoneNumber: updated.phoneNumber,
          email: updated.email,
          avatarUrl: updated.avatarUrl,
          role: updated.role as typeof user.role,
        });
      }
      toast.success(t("settings.contactInfoSaved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("settings.profileSaveError")));
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh avatar tối đa 2MB");
      return;
    }
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setAvatarUploadError(null);
    setImgDimensions({ width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    setSelectedAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setIsCropDialogOpen(true);
  }

  function handleCloseCropDialog() {
    if (isUploadingAvatar) return;
    setIsCropDialogOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
    setSelectedAvatarFile(null);
    setAvatarUploadError(null);
    setImgDimensions({ width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    setAvatarInputKey((current) => current + 1);
  }

  useEffect(() => {
    return () => {
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
      }
    };
  }, [cropImageSrc]);

  const constrainPosition = (x: number, y: number, currentZoom: number) => {
    if (imgDimensions.width === 0 || imgDimensions.height === 0) {
      return { x, y };
    }
    const wScaled = imgDimensions.width * currentZoom;
    const hScaled = imgDimensions.height * currentZoom;
    const containerSize = 250;

    const minX = containerSize - wScaled;
    const maxX = 0;
    const clampedX = Math.min(Math.max(x, minX), maxX);

    const minY = containerSize - hScaled;
    const maxY = 0;
    const clampedY = Math.min(Math.max(y, minY), maxY);

    return { x: clampedX, y: clampedY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition(constrainPosition(newX, newY, zoom));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      setPosition(constrainPosition(newX, newY, zoom));
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [isDragging, dragStart, zoom, imgDimensions]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const containerSize = 250;
    let w = containerSize;
    let h = containerSize;

    if (naturalWidth > naturalHeight) {
      h = containerSize;
      w = containerSize * (naturalWidth / naturalHeight);
    } else {
      w = containerSize;
      h = containerSize * (naturalHeight / naturalWidth);
    }

    setImgDimensions({ width: w, height: h });
    const initX = (containerSize - w) / 2;
    const initY = (containerSize - h) / 2;
    setPosition({ x: initX, y: initY });
    setZoom(1);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPosition((current) => constrainPosition(current.x, current.y, newZoom));
  };

  const handleSaveCrop = () => {
    if (!imageRef.current || !containerRef.current) return;
    setAvatarUploadError(null);
    const img = imageRef.current;
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();
    const imageRect = img.getBoundingClientRect();

    const scaleX = img.naturalWidth / imageRect.width;
    const scaleY = img.naturalHeight / imageRect.height;

    const sx = (containerRect.left - imageRect.left) * scaleX;
    const sy = (containerRect.top - imageRect.top) * scaleY;
    const sWidth = containerRect.width * scaleX;
    const sHeight = containerRect.height * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      const message = t("settings.avatarCropError");
      setAvatarUploadError(message);
      toast.error(message);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    try {
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 400, 400);
    } catch {
      const message = t("settings.avatarCropError");
      setAvatarUploadError(message);
      toast.error(message);
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        const message = t("settings.avatarCropError");
        setAvatarUploadError(message);
        toast.error(message);
        return;
      }

      const croppedFile = new File([blob], selectedAvatarFile?.name || "avatar.jpg", {
        type: "image/jpeg",
      });
      void uploadCroppedAvatar(croppedFile);
    }, "image/jpeg", 0.9);
  };

  async function uploadCroppedAvatar(file: File) {
    try {
      setIsUploadingAvatar(true);
      const updated = await uploadAvatar(file);
      setProfile(updated);
      if (user) {
        setUser({
          ...user,
          fullName: updated.fullName,
          email: updated.email,
          avatarUrl: updated.avatarUrl,
          role: updated.role as typeof user.role,
        });
      }
      setIsCropDialogOpen(false);
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
      }
      setSelectedAvatarFile(null);
      setAvatarUploadError(null);
      setAvatarInputKey((current) => current + 1);
      toast.success("Đã cập nhật avatar");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật avatar"));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t("settings.passwordRequired"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(t("settings.passwordSuccess"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("settings.passwordError")));
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId);
    try {
      setRevokingSessionId(sessionId);
      await revokeSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setSessionPendingRevoke(null);
      toast.success(t("settings.sessionRevoked", "Đã thu hồi phiên đăng nhập"));
      if (session?.deviceId === currentDeviceId) {
        logout();
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("settings.sessionRevokeError", "Không thể thu hồi phiên")));
    } finally {
      setRevokingSessionId(null);
    }
  }


  function updateDisplayPreference(next: DisplayPreferences) {
    setDisplayPreferences(next);
    savePreferences(next);
    setTheme(next.theme);
    document.documentElement.lang = next.language;
    document.documentElement.setAttribute("data-lang", next.language);
    void i18n.changeLanguage(next.language);
    toast.success(t("settings.preferencesSaved"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{t("settings.pageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("settings.pageSubtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-brand-soft text-base font-semibold text-brand-soft-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{displayName}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {profile?.email || user?.email || t("settings.noEmail")}
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {t("settings.memberBadge", { defaultValue: "Thành viên" })}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                        isActive ? "bg-brand-soft text-brand-soft-foreground" : "text-foreground/80 hover:bg-muted/40"
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold">{t(`settings.${section.titleKey}`)}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t(`settings.${section.descriptionKey}`)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <section>
          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.profileTitle")}</CardTitle>
                <CardDescription>{t("settings.profileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/40 p-4">
                  <Avatar className="h-20 w-20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-brand-soft text-xl font-semibold text-brand-soft-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar-upload">Avatar</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        key={avatarInputKey}
                        id="avatar-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="h-10 max-w-sm cursor-pointer"
                        disabled={isUploadingAvatar}
                        onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Hỗ trợ JPG, PNG, WEBP. Tối đa 2MB.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-lastname" className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      {t("settings.lastName", { defaultValue: "Họ" })}
                    </Label>
                    <Input
                      id="account-lastname"
                      className="h-10"
                      value={profileForm.lastName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-firstname" className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      {t("settings.firstName", { defaultValue: "Tên" })}
                    </Label>
                    <Input
                      id="account-firstname"
                      className="h-10"
                      value={profileForm.firstName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("settings.email")}
                    </Label>
                    <Input
                      id="account-email"
                      className="h-10 bg-muted/50 text-muted-foreground"
                      value={profileForm.email}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t("settings.phoneNumber", { defaultValue: "Số điện thoại" })}
                    </Label>
                    <Input
                      id="account-phone"
                      type="tel"
                      className="h-10"
                      value={profileForm.phoneNumber}
                      onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-dob" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {t("settings.dob", { defaultValue: "Ngày sinh" })}
                    </Label>
                    <Input
                      id="account-dob"
                      className="h-10 bg-muted/50 text-muted-foreground"
                      value={profile?.dob ? formatDate(profile.dob, locale) : "-"}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-gender">{t("settings.gender", { defaultValue: "Giới tính" })}</Label>
                    <Input
                      id="account-gender"
                      className="h-10 bg-muted/50 text-muted-foreground"
                      value={genderLabel(profile?.gender)}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="account-role" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {t("settings.role")}
                    </Label>
                    <div id="account-role" className="flex h-10 items-center rounded-md border bg-muted/40 px-3">
                      <Badge variant="secondary">{t("settings.userRole", { defaultValue: "Người dùng" })}</Badge>
                      <span className="ml-3 truncate text-xs text-muted-foreground">
                        {t("settings.rolePerClass", { defaultValue: "Giáo viên / học sinh được xác định theo từng lớp." })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">{t("settings.accountStatus")}</div>
                      <Badge className="mt-1" variant={profile?.isActive === false ? "destructive" : "default"}>
                        {profile?.isActive === false
                          ? t("settings.accountInactive")
                          : t("settings.accountActive")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">{t("settings.accountCreatedAt")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {formatDateTime(profile?.createdAt, locale)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" className="gap-2" onClick={handleProfileCancel}>
                    <X className="h-4 w-4" />
                    {t("settings.cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => void handleProfileSave()}
                    disabled={isLoadingProfile || isSavingProfile || !profileFormChanged}
                  >
                    <Save className={`h-4 w-4 ${isSavingProfile ? "animate-pulse" : ""}`} />
                    {t("settings.saveChanges")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.passwordTitle")}</CardTitle>
                  <CardDescription>{t("settings.passwordDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasPassword ? (
                    <div className="flex flex-col gap-4 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{t("settings.passwordNotSet")}</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("settings.passwordNotSetDesc")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="shrink-0 gap-2"
                        onClick={() =>
                          navigate("/forgot-password", {
                            state: { email: profile?.email ?? user?.email ?? "" },
                          })
                        }
                      >
                        <LockKeyhole className="h-4 w-4" />
                        {t("settings.setupPassword")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        {([
                          {
                            id: "current-password",
                            label: t("settings.currentPassword"),
                            value: passwordForm.currentPassword,
                            visible: showPasswords.current,
                            autoComplete: "current-password",
                            update: (value: string) =>
                              setPasswordForm((current) => ({ ...current, currentPassword: value })),
                            toggle: () =>
                              setShowPasswords((current) => ({ ...current, current: !current.current })),
                          },
                          {
                            id: "new-password",
                            label: t("settings.newPassword"),
                            value: passwordForm.newPassword,
                            visible: showPasswords.next,
                            autoComplete: "new-password",
                            update: (value: string) =>
                              setPasswordForm((current) => ({ ...current, newPassword: value })),
                            toggle: () =>
                              setShowPasswords((current) => ({ ...current, next: !current.next })),
                          },
                          {
                            id: "confirm-password",
                            label: t("settings.confirmPassword"),
                            value: passwordForm.confirmPassword,
                            visible: showPasswords.confirm,
                            autoComplete: "new-password",
                            update: (value: string) =>
                              setPasswordForm((current) => ({ ...current, confirmPassword: value })),
                            toggle: () =>
                              setShowPasswords((current) => ({ ...current, confirm: !current.confirm })),
                          },
                        ] as const).map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <div className="relative">
                              <Input
                                id={field.id}
                                type={field.visible ? "text" : "password"}
                                autoComplete={field.autoComplete}
                                className="h-10 pr-10"
                                value={field.value}
                                onChange={(event) => field.update(event.target.value)}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                onClick={field.toggle}
                                aria-label={field.visible ? t("settings.hidePassword") : t("settings.showPassword")}
                              >
                                {field.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{t("settings.passwordHint")}</p>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isChangingPassword}
                          onClick={() => setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })}
                        >
                          {t("settings.cancel")}
                        </Button>
                        <Button
                          type="button"
                          className="gap-2"
                          onClick={() => void handleChangePassword()}
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LockKeyhole className="h-4 w-4" />
                          )}
                          {t("settings.updatePassword")}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t("settings.sessionsTitle")}</CardTitle>
                    <CardDescription>{t("settings.sessionsDesc")}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      setIsLoadingSessions(true);
                      try {
                        setSessions(await getSessions());
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, t("settings.sessionsLoadError")));
                      } finally {
                        setIsLoadingSessions(false);
                      }
                    }}
                    disabled={isLoadingSessions}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingSessions ? "animate-spin" : ""}`} />
                    {t("settings.reload")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessions.length === 0 && (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {t("settings.noSessions")}
                      </div>
                    )}
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-4 rounded-md border p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Laptop className="h-5 w-5 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {t("settings.device")} {session.deviceId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("settings.lastActive")}: {formatDateTime(session.lastActive, locale)}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline">{session.appVersion || "App"}</Badge>
                          {session.deviceId === currentDeviceId && (
                            <Badge variant="default">{t("settings.currentDevice")}</Badge>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700"
                            disabled={revokingSessionId === session.id}
                            onClick={() => setSessionPendingRevoke(session)}
                          >
                            <X className={`h-4 w-4 ${revokingSessionId === session.id ? "animate-pulse" : ""}`} />
                            {t("settings.revokeSession", "Thu hồi")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.preferencesTitle")}</CardTitle>
                <CardDescription>{t("settings.preferencesDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      {t("settings.language")}
                    </Label>
                    <Select
                      value={displayPreferences.language}
                      onValueChange={(value) =>
                        updateDisplayPreference({ ...displayPreferences, language: value as DisplayPreferences["language"] })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">{t('settings.vietnamese')}</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      {t("settings.theme")}
                    </Label>
                    <Select
                      value={
                        theme === "light" || theme === "dark" || theme === "system"
                          ? theme
                          : displayPreferences.theme
                      }
                      onValueChange={(value) =>
                        updateDisplayPreference({ ...displayPreferences, theme: value as DisplayPreferences["theme"] })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                        <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                        <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {t("settings.preferenceNote")}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <AlertDialog
        open={Boolean(sessionPendingRevoke)}
        onOpenChange={(open) => {
          if (!open && !revokingSessionId) setSessionPendingRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.revokeSessionConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionPendingRevoke?.deviceId === currentDeviceId
                ? t("settings.revokeCurrentSessionConfirmDesc")
                : t("settings.revokeSessionConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(revokingSessionId)}>
              {t("settings.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!sessionPendingRevoke || Boolean(revokingSessionId)}
              onClick={(event) => {
                event.preventDefault();
                if (sessionPendingRevoke) void handleRevokeSession(sessionPendingRevoke.id);
              }}
            >
              {revokingSessionId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.revokeSession", "Thu hồi")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCropDialogOpen} onOpenChange={(open) => { if (!open && !isUploadingAvatar) handleCloseCropDialog(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cắt ảnh đại diện</DialogTitle>
            <DialogDescription>
              Kéo để di chuyển vị trí ảnh, kéo thanh trượt bên dưới để phóng to/thu nhỏ.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4 space-y-6">
            <div
              ref={containerRef}
              className="relative w-[250px] h-[250px] overflow-hidden bg-black rounded-full select-none cursor-move"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {cropImageSrc && (
                <img
                  ref={imageRef}
                  src={cropImageSrc}
                  alt="Crop preview"
                  className="absolute max-w-none max-h-none pointer-events-none select-none"
                  style={{
                    width: `${imgDimensions.width}px`,
                    height: `${imgDimensions.height}px`,
                    left: 0,
                    top: 0,
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                  onLoad={handleImageLoad}
                  onError={() => {
                    const message = t("settings.avatarPreviewError");
                    setAvatarUploadError(message);
                    toast.error(message);
                  }}
                />
              )}
              <div className="absolute inset-0 rounded-full border border-white/50 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>

            {avatarUploadError && (
              <p className="w-full px-4 text-sm text-destructive">{avatarUploadError}</p>
            )}

            <div className="flex items-center gap-3 w-full px-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(val) => handleZoomChange(val[0])}
                className="flex-grow"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCropDialog}
              disabled={isUploadingAvatar}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSaveCrop}
              disabled={isUploadingAvatar || imgDimensions.width === 0}
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
