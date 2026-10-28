const fallbackApiBaseUrl = "http://localhost:8080/api/v1";

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? "OMR Admin",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
};
