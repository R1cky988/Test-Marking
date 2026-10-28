import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionBankInfo, QuestionBankPayload } from "../questionBanks.api";

export function BankFormDialog({ open, onOpenChange, bank, saving, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank: QuestionBankInfo | null;
  saving: boolean;
  onSave: (payload: QuestionBankPayload) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(bank?.name ?? "");
    setSubject(bank?.subject ?? "");
    setDescription(bank?.description ?? "");
    setInvalid(false);
  }, [open, bank]);

  function submit() {
    if (!name.trim()) { setInvalid(true); return; }
    onSave({ name: name.trim(), subject: subject.trim(), description: description.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{bank ? t("qb.bank.editTitle", "Sửa ngân hàng câu hỏi") : t("qb.bank.createTitle", "Tạo ngân hàng câu hỏi")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-2">
            <Label htmlFor="bank-name">{t("qb.bank.name", "Tên ngân hàng")}</Label>
            <Input id="bank-name" value={name} maxLength={200} aria-invalid={invalid} onChange={(e) => { setName(e.target.value); setInvalid(false); }} placeholder={t("qb.bank.namePlaceholder", "Ví dụ: Đại số 10 – Chương 2")} autoFocus />
            {invalid && <p role="alert" className="text-xs text-destructive">{t("qb.bank.nameRequired", "Hãy nhập tên ngân hàng.")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-subject">{t("qb.bank.subject", "Môn học")}</Label>
            <Input id="bank-subject" value={subject} maxLength={100} onChange={(e) => setSubject(e.target.value)} placeholder={t("qb.bank.subjectPlaceholder", "Toán, Vật lý...")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-desc">{t("qb.bank.description", "Mô tả")}</Label>
            <Textarea id="bank-desc" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("qb.cancel", "Hủy")}</Button>
            <Button type="submit" disabled={saving}>{saving ? t("qb.saving", "Đang lưu...") : bank ? t("qb.save", "Lưu thay đổi") : t("qb.bank.create", "Tạo ngân hàng")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
