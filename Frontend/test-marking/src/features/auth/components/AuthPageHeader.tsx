import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
};

export function AuthPageHeader({ icon: Icon, title, subtitle }: AuthPageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-muted/50">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <div className="text-sm leading-relaxed text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}
