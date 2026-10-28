import { toast } from "sonner";
import { AxiosError } from "axios";
import i18n from "@/i18n";
import type { ApiErrorBody } from "@/types/auth.types";
import { formatUserFacingMessage, resolveApiErrorMessage } from "@/lib/apiErrorMessage";

/**
 * Parse và hiển thị lỗi API theo cấu trúc chuẩn { error: { message, details } }.
 * Fallback về message mặc định nếu không parse được.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage = i18n.t("errors.fallback")
): void {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;

    if (data?.error?.message) {
      toast.error(resolveApiErrorMessage(data.error, fallbackMessage));

      // Show validation details if provided.
      if (data.error.details?.length) {
        data.error.details.forEach((detail) => {
          if (typeof detail === 'string') {
            toast.error(formatUserFacingMessage(detail));
            return;
          }

          toast.error(formatUserFacingMessage(detail.message), {
            description: detail.field ? i18n.t("errors.fieldPrefix", { field: detail.field }) : undefined,
          });
        });
      }
      return;
    }

    // HTTP status messages
    if (error.response?.status === 404) {
      toast.error(i18n.t("errors.notFound"));
      return;
    }
    if (error.response?.status === 403) {
      toast.error(i18n.t("errors.forbidden"));
      return;
    }
    if (error.response?.status >= 500) {
      toast.error(i18n.t("errors.server"));
      return;
    }
  }

  toast.error(fallbackMessage);
}
