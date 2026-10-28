import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * ProtectedRoute — Chuyển hướng về /login nếu chưa xác thực.
 * Bọc bên ngoài các layout/trang yêu cầu đăng nhập.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
