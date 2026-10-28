import { appConfig } from "@/config/env";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function getApiOrigin() {
  try {
    return new URL(appConfig.apiBaseUrl).origin;
  } catch {
    return appConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  }
}

function isPrivateHost(hostname: string) {
  if (localHosts.has(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function normalizeLocalFilePath(pathname: string) {
  if (pathname.startsWith("/api/v1/uploads/")) return pathname;
  if (pathname.startsWith("/uploads/")) return `/api/v1${pathname}`;
  if (pathname.startsWith("uploads/")) return `/api/v1/${pathname}`;
  if (pathname.startsWith("/api/v1/exports/")) return pathname;
  if (pathname.startsWith("/exports/")) return `/api/v1${pathname}`;
  if (pathname.startsWith("exports/")) return `/api/v1/${pathname}`;
  return null;
}

export function resolveServerFileUrl(value?: string | null) {
  if (!value) return "";
  if (/^(data:|blob:)/i.test(value)) return value;

  const origin = getApiOrigin();
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const localPath = normalizeLocalFilePath(parsed.pathname);
      if (localPath && isPrivateHost(parsed.hostname)) {
        return `${origin}${localPath}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  const localPath = normalizeLocalFilePath(value);
  if (localPath) return `${origin}${localPath}`;
  if (value.startsWith("/api/")) return `${origin}${value}`;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}
