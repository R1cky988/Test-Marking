import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UploadExcelBoxProps {
  onFileChange: (file: File | null) => void;
  onDownloadTemplate?: () => void;
  accept?: string;
  className?: string;
}

export function UploadExcelBox({
  onFileChange,
  onDownloadTemplate,
  accept = ".xlsx,.xls",
  className,
}: UploadExcelBoxProps) {
  const { t } = useTranslation();

  return (
    <div className={className ?? "flex gap-2"}>
      <Input
        type="file"
        accept={accept}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={onDownloadTemplate}
        disabled={!onDownloadTemplate}
      >
        <Download className="w-4 h-4" />
        {t("common.downloadTemplate")}
      </Button>
    </div>
  );
}
