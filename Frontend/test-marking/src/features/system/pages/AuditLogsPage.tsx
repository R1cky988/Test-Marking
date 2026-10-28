import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-brand-soft text-brand-soft-foreground",
  delete: "bg-red-100 text-red-800",
};

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");

  const actionLabels: Record<string, string> = {
    create: t("system.audit.actions.create"),
    update: t("system.audit.actions.update"),
    delete: t("system.audit.actions.delete"),
  };

  const auditLogs = useMemo(
    () => [
      {
        id: 1,
        action: "create",
        table: "exams",
        description: t("system.audit.samples.createExam"),
        oldValue: null,
        newValue: t("system.audit.samples.examName"),
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-21 14:30:25",
      },
      {
        id: 2,
        action: "update",
        table: "answer_keys",
        description: t("system.audit.samples.updateAnswerKey"),
        oldValue: "B",
        newValue: "C",
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-21 13:45:12",
      },
      {
        id: 3,
        action: "update",
        table: "results",
        description: t("system.audit.samples.editScore"),
        oldValue: "7.5",
        newValue: "8.0",
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-21 12:20:08",
      },
      {
        id: 4,
        action: "delete",
        table: "classes",
        description: t("system.audit.samples.archiveClass"),
        oldValue: t("system.audit.samples.className"),
        newValue: null,
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-20 16:15:30",
      },
      {
        id: 5,
        action: "create",
        table: "students",
        description: t("system.audit.samples.addStudent"),
        oldValue: null,
        newValue: t("system.audit.samples.studentName"),
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-20 10:05:42",
      },
      {
        id: 6,
        action: "update",
        table: "answer_keys",
        description: t("system.audit.samples.regrade"),
        oldValue: t("system.audit.samples.version1"),
        newValue: t("system.audit.samples.version2"),
        user: t("system.audit.samples.user"),
        timestamp: "2026-04-19 15:30:18",
      },
    ],
    [t],
  );

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.oldValue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.newValue?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table === filterTable;
    return matchesSearch && matchesAction && matchesTable;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{t("system.audit.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("system.audit.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("system.audit.filters.title")}</CardTitle>
          <CardDescription>{t("system.audit.filters.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">{t("system.audit.filters.search")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  id="search"
                  placeholder={t("system.audit.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">{t("system.audit.filters.action")}</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="create">{t("system.audit.actions.create")}</SelectItem>
                  <SelectItem value="update">{t("system.audit.actions.update")}</SelectItem>
                  <SelectItem value="delete">{t("system.audit.actions.delete")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">{t("system.audit.filters.table")}</Label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger id="table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="exams">{t("system.audit.tables.exams")}</SelectItem>
                  <SelectItem value="classes">{t("system.audit.tables.classes")}</SelectItem>
                  <SelectItem value="students">{t("system.audit.tables.students")}</SelectItem>
                  <SelectItem value="answer_keys">{t("system.audit.tables.answerKeys")}</SelectItem>
                  <SelectItem value="results">{t("system.audit.tables.results")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("system.audit.logsTitle")}</CardTitle>
          <CardDescription>
            {t("system.audit.logsCount", { count: filteredLogs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("system.audit.table.time")}</TableHead>
                <TableHead>{t("system.audit.table.action")}</TableHead>
                <TableHead>{t("system.audit.table.table")}</TableHead>
                <TableHead>{t("system.audit.table.description")}</TableHead>
                <TableHead>{t("system.audit.table.oldValue")}</TableHead>
                <TableHead>{t("system.audit.table.newValue")}</TableHead>
                <TableHead>{t("system.audit.table.user")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColors[log.action]}>
                      {actionLabels[log.action]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {log.table}
                    </code>
                  </TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell>
                    {log.oldValue ? (
                      <span className="text-sm text-danger-foreground line-through">
                        {log.oldValue}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/70">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.newValue ? (
                      <span className="text-sm text-green-600 font-medium">
                        {log.newValue}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/70">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{log.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
