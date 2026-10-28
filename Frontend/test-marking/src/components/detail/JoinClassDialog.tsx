import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { joinClassByCode } from "@/features/classes/classDetail.api";

/** Student enters a join code. JOINED → open the class; PENDING → wait for the teacher. */
export function JoinClassDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: (result: { class_id: string; class_name: string; status: "JOINED" | "PENDING" }) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const join = useMutation({
    mutationFn: () => joinClassByCode(code.trim(), message.trim()),
    onSuccess: (result) => {
      toast.success(
        result.status === "JOINED"
          ? t("classes.join.joined", { defaultValue: "Bạn đã vào lớp" })
          : t("classes.join.pending", { defaultValue: "Đã gửi yêu cầu, đang chờ giáo viên duyệt" }),
      );
      setCode("");
      setMessage("");
      onOpenChange(false);
      onJoined?.(result);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.join.failed", { defaultValue: "Không thể tham gia lớp" }))),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("classes.join.title", { defaultValue: "Tham gia lớp học" })}</DialogTitle>
          <DialogDescription>{t("classes.join.description", { defaultValue: "Nhập mã lớp do giáo viên cung cấp" })}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) join.mutate();
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("classes.join.codePlaceholder", { defaultValue: "Mã lớp" })}
            aria-label={t("classes.join.codePlaceholder", { defaultValue: "Mã lớp" })}
            autoFocus
          />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            placeholder={t("classes.join.messagePlaceholder", { defaultValue: "Lời nhắn cho giáo viên (không bắt buộc)" })}
            aria-label={t("classes.join.messagePlaceholder", { defaultValue: "Lời nhắn cho giáo viên (không bắt buộc)" })}
          />
          <DialogFooter>
            <Button type="submit" disabled={!code.trim() || join.isPending}>
              {t("classes.join.submit", { defaultValue: "Tham gia" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
