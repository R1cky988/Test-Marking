import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/components/ui/utils";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import type { Person } from "@/features/classes/classDetail.api";

// Soft tint pairs from the app theme. A person always gets the same tint (hash of the name),
// so the same face is easy to spot across posts, comments and the member list.
const TINTS = [
  "bg-brand-soft text-brand-soft-foreground",
  "bg-success-soft text-success-foreground",
  "bg-warning-soft text-warning-foreground",
  "bg-info-soft text-info-foreground",
  "bg-danger-soft text-danger-foreground",
] as const;

function tintFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function PersonAvatar({ person, className }: { person: Pick<Person, "name" | "avatar_url"> | null | undefined; className?: string }) {
  const name = person?.name || "?";
  return (
    <Avatar className={className ?? "h-9 w-9"}>
      {person?.avatar_url && <AvatarImage src={resolveServerImageUrl(person.avatar_url) ?? undefined} alt={name} />}
      <AvatarFallback className={cn("font-semibold", tintFor(name))}>{name.trim().charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function fmtDateTime(value: string | null | undefined, locale = "vi-VN") {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

/** Empty list: say what is missing and, when the viewer can act, what to do about it. */
export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Small count next to a heading. */
export function CountPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{children}</span>;
}
