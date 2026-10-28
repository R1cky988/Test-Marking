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

function normalizeUploadPath(pathname: string) {
  if (pathname.startsWith("/api/v1/uploads/")) return pathname;
  if (pathname.startsWith("/uploads/")) return `/api/v1${pathname}`;
  return null;
}

export function resolveServerImageUrl(value?: string | null) {
  if (!value) return "";
  if (/^(data:|blob:)/i.test(value)) return value;

  const normalizedValue = value.replace(/^(\.\.\/)+/, "/").replace(/^\.\/+/, "");
  const origin = getApiOrigin();
  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const parsed = new URL(normalizedValue);
      const uploadPath = normalizeUploadPath(parsed.pathname);
      if (uploadPath && isPrivateHost(parsed.hostname)) {
        return `${origin}${uploadPath}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return normalizedValue;
    }
    return normalizedValue;
  }

  if (normalizedValue.startsWith("/api/")) return `${origin}${normalizedValue}`;
  if (normalizedValue.startsWith("api/")) return `${origin}/${normalizedValue}`;
  if (normalizedValue.startsWith("/uploads/")) return `${origin}/api/v1${normalizedValue}`;
  if (normalizedValue.startsWith("uploads/")) return `${origin}/api/v1/${normalizedValue}`;
  return `${origin}${normalizedValue.startsWith("/") ? "" : "/"}${normalizedValue}`;
}
