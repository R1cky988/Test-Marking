import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  LibraryBig,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { logout as logoutRequest } from "@/api/endpoints/auth.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';

const preferenceStorageKey = "teacher_settings_preferences";

const navKeys = [
  { nameKey: 'layout.nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'layout.nav.classes', href: '/classes', icon: Users },
  { nameKey: 'layout.nav.exams', href: '/exams', icon: FileText },
  { nameKey: 'layout.nav.questionBanks', href: '/teacher/question-banks', icon: LibraryBig },
  { nameKey: 'layout.nav.templates', href: '/templates', icon: LayoutTemplate },
];

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex h-15 shrink-0 items-center ${collapsed ? "justify-center px-2" : "justify-between px-2.5"}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.07] dark:text-zinc-50">
            <ScanLine className="h-[18px] w-[18px] stroke-[2.1]" />
          </div>
          {!collapsed && <h1 className="truncate text-[15px] font-semibold text-foreground">Test Marking</h1>}
        </div>
        {!collapsed && onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 rounded-lg text-[#52525B] shadow-none hover:bg-[#EFEFED] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-zinc-100 md:inline-flex"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-2.5"}`}>
        {navKeys.map((item) => {
          const name = t(item.nameKey);
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.nameKey}
              to={item.href}
              onClick={onNavigate}
              className={`group flex min-w-0 items-center rounded-xl py-2.5 text-[13px] transition-all ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${
                isActive
                  ? 'bg-white font-semibold text-[#111111] shadow-sm ring-1 ring-[#E5E5E5] dark:bg-white/[0.07] dark:text-white dark:shadow-none dark:ring-1 dark:ring-white/[0.08]'
                  : 'text-[#52525B] hover:bg-[#EFEFED] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-zinc-100'
              }`}
              title={collapsed ? name : undefined}
            >
              <item.icon className="h-[17px] w-[17px] shrink-0 stroke-[2.15]" />
              {!collapsed && <span className={`truncate text-sm ${isActive ? "font-semibold" : "font-medium"}`}>{name}</span>}
            </Link>
          );
        })}
      </nav>
      {collapsed && onToggleCollapse && (
        <div className="px-2 pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 w-full rounded-xl text-[#52525B] shadow-none hover:bg-[#EFEFED] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-zinc-100"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function RootLayout() {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  // Every account has the same menu: question banks and templates are system features for all users.
  // Teacher / student is decided per class (see ClassDetailPage), not per account.
  const logout = useAuthStore((state) => state.logout);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"notifications" | "profile" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);

  const displayName = user?.fullName || t('layout.teacherFallback');
  const avatarUrl = resolveServerImageUrl(user?.avatarUrl);
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || t('layout.initialsFallback');

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    function handleCommandShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    document.addEventListener("keydown", handleCommandShortcut);
    return () => document.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  async function handleLogout() {
    try {
      await logoutRequest();
    } catch (error) {
      toast.warning(getApiErrorMessage(error, t('layout.logoutFailed')));
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  function handleToggleTheme() {
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      const raw = localStorage.getItem(preferenceStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        preferenceStorageKey,
        JSON.stringify({
          ...parsed,
          display: {
            ...parsed.display,
            theme: nextTheme,
          },
        }),
      );
    } catch {
      localStorage.setItem(preferenceStorageKey, JSON.stringify({ display: { theme: nextTheme } }));
    }
  }

  function runCommand(path: string) {
    setCommandOpen(false);
    navigate(path);
  }

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <aside className={`fixed inset-y-0 left-0 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block ${sidebarCollapsed ? "w-[72px]" : "w-[224px]"}`}>
        <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(18rem,calc(100vw-1rem))] gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('layout.nav.dashboard')}</SheetTitle>
            <SheetDescription>Test Marking navigation</SheetDescription>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={`flex h-dvh min-w-0 flex-col bg-background transition-[padding] duration-200 dark:bg-[#141416] ${sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[224px]"}`}>
        <header className="z-10 h-16 shrink-0 border-b border-border/70 bg-background/85 backdrop-blur dark:border-white/[0.06] dark:bg-[#111113]/80">
          <div className="flex h-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="truncate text-base font-semibold text-foreground md:hidden">Test Marking</span>
            </div>

            <div ref={menuRef} className="relative flex min-w-0 items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="hidden h-9 min-w-[240px] justify-start gap-2 rounded-xl border-border/80 bg-card px-3 text-muted-foreground shadow-none hover:bg-card hover:text-foreground dark:border-white/[0.08] dark:bg-[#17171A] dark:text-zinc-500 dark:hover:bg-[#1F1F23] dark:hover:text-zinc-100 md:flex"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-sm font-normal">{t("layout.search.button")}</span>
                <kbd className="ml-auto rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-500">
                  Ctrl K
                </kbd>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl shadow-none"
                onClick={handleToggleTheme}
                aria-label={(theme === "system" ? resolvedTheme : theme) === "dark" ? t("layout.theme.switchToLight") : t("layout.theme.switchToDark")}
              >
                {themeMounted && (theme === "system" ? resolvedTheme : theme) === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 gap-2 rounded-xl px-2 pr-3 shadow-none hover:bg-accent"
                  onClick={() => setOpenDropdown((current) => (current === "profile" ? null : "profile"))}
                >
                  <Avatar className="h-9 w-9">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-44 truncate text-sm font-medium text-foreground sm:inline">{displayName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">{t('layout.userMenu.account')}</span>
                </Button>

                {openDropdown === "profile" && (
                  <div className="absolute right-0 top-full z-[100] mt-3 w-56 animate-in fade-in-0 zoom-in-95 rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-floating)]">
                    <div className="truncate px-3 py-2 text-sm font-semibold text-foreground">{displayName}</div>
                    <div className="my-1 h-px bg-border" />
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setOpenDropdown(null)}
                    >
                      <Settings className="h-4 w-4" />
                      {t('layout.userMenu.settings')}
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger-foreground transition-colors hover:bg-danger-soft"
                      onClick={() => {
                        setOpenDropdown(null);
                        setLogoutDialogOpen(true);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t('layout.userMenu.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6">
          <motion.div
            className="h-full"
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title={t("layout.search.title")} description={t("layout.search.description")}>
        <CommandInput placeholder={t("layout.search.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("layout.search.noResults")}</CommandEmpty>
          <CommandGroup heading={t("layout.search.navigation")}>
            {navKeys.map((item) => (
              <CommandItem key={item.href} onSelect={() => runCommand(item.href)}>
                <item.icon className="h-4 w-4" />
                <span>{t(item.nameKey)}</span>
                <CommandShortcut>{t("layout.search.go")}</CommandShortcut>
              </CommandItem>
            ))}
            <CommandItem onSelect={() => runCommand("/settings")}>
              <Settings className="h-4 w-4" />
              <span>{t('layout.userMenu.settings')}</span>
              <CommandShortcut>{t("layout.search.go")}</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('layout.userMenu.logout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('layout.logoutConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleLogout()}
            >
              {t('layout.userMenu.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
