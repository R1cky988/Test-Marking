import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const scoreDistribution = [
  { range: "0-2", count: 2 },
  { range: "2-4", count: 5 },
  { range: "4-6", count: 12 },
  { range: "6-8", count: 18 },
  { range: "8-10", count: 8 },
];

const questionAnalysis = [
  { question: 1, correct: 92, difficulty: "easy", aPercent: 92, bPercent: 5, cPercent: 2, dPercent: 1 },
  { question: 2, correct: 85, difficulty: "easy", aPercent: 10, bPercent: 85, cPercent: 3, dPercent: 2 },
  { question: 3, correct: 45, difficulty: "medium", aPercent: 20, bPercent: 15, cPercent: 45, dPercent: 20 },
  { question: 4, correct: 78, difficulty: "easy", aPercent: 12, bPercent: 5, cPercent: 5, dPercent: 78 },
  { question: 5, correct: 35, difficulty: "hard", aPercent: 35, bPercent: 25, cPercent: 20, dPercent: 20 },
  { question: 6, correct: 8, difficulty: "veryHard", aPercent: 8, bPercent: 30, cPercent: 32, dPercent: 30 },
  { question: 7, correct: 68, difficulty: "medium", aPercent: 15, bPercent: 68, cPercent: 12, dPercent: 5 },
  { question: 8, correct: 88, difficulty: "easy", aPercent: 5, bPercent: 3, cPercent: 88, dPercent: 4 },
];

export function ReportsPage() {
  const { t } = useTranslation();
  const exportExcel = () => {
    toast.success(t('reports.exportSuccess'));
  };

  const exportPDF = () => {
    toast.success(t('reports.exportSuccess'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t('reports.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <Download className="w-4 h-4" />
            {t('reports.exportExcel')}
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            {t('reports.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.scoreDistribution')}</CardTitle>
          <CardDescription>{t('reports.scoreDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name={t('reports.students')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Question Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.questionAnalysis')}</CardTitle>
          <CardDescription>
            {t('reports.questionAnalysisDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.table.question')}</TableHead>
                <TableHead>{t('reports.table.correctRate')}</TableHead>
                <TableHead>{t('reports.table.difficulty')}</TableHead>
                <TableHead>A</TableHead>
                <TableHead>B</TableHead>
                <TableHead>C</TableHead>
                <TableHead>D</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionAnalysis.map((q) => (
                <TableRow
                  key={q.question}
                  className={q.correct < 20 ? "bg-danger-soft" : q.correct < 40 ? "bg-warning-soft" : ""}
                >
                  <TableCell className="font-medium">{t('reports.table.question')} {q.question}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${
                            q.correct >= 70
                              ? "bg-success-foreground"
                              : q.correct >= 40
                              ? "bg-warning-foreground"
                              : "bg-danger-foreground"
                          }`}
                          style={{ width: `${q.correct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10">{q.correct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        q.difficulty === "easy"
                          ? "bg-green-100 text-green-800"
                          : q.difficulty === "medium"
                          ? "bg-brand-soft text-brand-soft-foreground"
                          : q.difficulty === "hard"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {t(`difficulty.${q.difficulty}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{q.aPercent}%</TableCell>
                  <TableCell className="text-sm">{q.bPercent}%</TableCell>
                  <TableCell className="text-sm">{q.cPercent}%</TableCell>
                  <TableCell className="text-sm">{q.dPercent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-warning-soft border border-warning-soft rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-warning-foreground rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium text-yellow-800">{t('reports.table.warning')}</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('reports.table.warningText', { num: 6 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">{t('reports.summary.averageScore')}</div>
            <div className="text-3xl font-semibold mt-2">7.2</div>
            <div className="text-sm text-green-600 mt-1">+0.5 {t('reports.summary.vsPrevious')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">{t('reports.summary.passRate')}</div>
            <div className="text-3xl font-semibold mt-2">84%</div>
            <div className="text-sm text-green-600 mt-1">+3% {t('reports.summary.vsPrevious')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">{t('reports.summary.avgDifficulty')}</div>
            <div className="text-3xl font-semibold mt-2">{t('reports.summary.moderate')}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('reports.summary.suitable')}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
