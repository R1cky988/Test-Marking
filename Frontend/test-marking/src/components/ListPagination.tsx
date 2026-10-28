import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListPaginationProps = {
  page: number;
  limit: number;
  total: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  hideItemCount?: boolean;
};

export function ListPagination({
  page,
  limit,
  total,
  isLoading = false,
  onPageChange,
  onLimitChange,
  hideItemCount = false,
}: ListPaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      {hideItemCount ? (
        <div />
      ) : (
        <div>{t("exams.pagination.items", { count: total, defaultValue: `${total} mục` })}</div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label>{t("exams.pagination.show")}</Label>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>{t("exams.pagination.page", { page, totalPages })}</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            {t("exams.pagination.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            {t("exams.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
