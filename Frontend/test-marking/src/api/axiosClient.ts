import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/env';
import { getDeviceId } from '@/lib/device';
import { extractTokens } from '@/api/spring';

// ============================================================
// Axios Instance
// ============================================================

const axiosClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================================
// Token helpers — đọc trực tiếp từ localStorage để tránh
// circular dependency với Zustand store
// ============================================================

const TOKEN_STORAGE_KEY = 'omr_auth_storage';

function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function updateAccessToken(accessToken: string, refreshToken: string): void {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { state: {} };
    parsed.state.accessToken = accessToken;
    parsed.state.refreshToken = refreshToken;
    parsed.state.isAuthenticated = true;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

// ============================================================
// Request Interceptor: gắn Authorization + X-Device-Id
// ============================================================

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = getStoredTokens();
    // The Spring JWT filter answers 401 to ANY request carrying an expired token, even /user/login.
    // So never send the stored token to the login / register / verify calls.
    if (accessToken && !isAuthFlowRequest(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    config.headers['X-Device-Id'] = getDeviceId();
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Response Interceptor: tự động refresh khi token hết hạn (401)
// ============================================================

// Flag để tránh nhiều request cùng lúc đều trigger refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

function isAuthFlowRequest(url?: string): boolean {
  if (!url) return false;

  return (
    url.includes('/user/login') ||
    url.includes('/user/register') ||
    url.includes('/user/verify-email') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/otp') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/student/auth/login') ||
    url.includes('/student/auth/register') ||
    url.includes('/student/auth/otp')
  );
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Chỉ xử lý lỗi 401, không retry request refresh chính nó
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/user/refresh') ||
      originalRequest.url?.includes('/auth/refresh') ||
      isAuthFlowRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Nếu đang refresh, queue request để chạy lại sau
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken } = getStoredTokens();
    const deviceId = getDeviceId();

    if (!refreshToken) {
      isRefreshing = false;
      clearAuthStorage();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      // Spring: POST /user/refresh { refreshToken } -> { data: { AccessToken, RefreshToken } }
      const response = await axios.post(
        `${appConfig.apiBaseUrl}/user/refresh`,
        { refreshToken },
        {
          headers: {
            'X-Device-Id': deviceId,
          },
        }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = extractTokens(response.data);

      updateAccessToken(newAccessToken, newRefreshToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthStorage();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;
