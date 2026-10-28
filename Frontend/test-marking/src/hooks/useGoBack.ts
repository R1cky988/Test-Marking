import { useCallback } from "react";
import { useNavigate } from "react-router";

/**
 * Hook trả về hàm goBack():
 * - Nếu có lịch sử điều hướng → window.history.back()
 * - Nếu không có → navigate đến defaultPath
 *
 * @param defaultPath Path mặc định khi không có lịch sử
 */
export function useGoBack(defaultPath: string) {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // history.length > 1 nghĩa là có trang trước trong session
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(defaultPath, { replace: true });
    }
  }, [navigate, defaultPath]);

  return goBack;
}
