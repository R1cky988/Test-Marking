import { createBrowserRouter, Navigate, useParams } from "react-router";

// Layouts & Guards
import { RootLayout } from "@/components/layouts/RootLayout";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layouts/ProtectedRoute";
import { OMRTemplateDesigner } from "@/features/templates/OMRTemplateDesigner";

// ─── Lazy loaders ──────────────────────────────────────────────────

// Auth
const loadLoginPage = () =>
  import("@/features/auth/pages/LoginPage").then((m) => ({ Component: m.LoginPage }));
const loadRegisterPage = () =>
  import("@/features/auth/pages/RegisterPage").then((m) => ({ Component: m.RegisterPage }));
const loadOtpVerificationPage = () =>
  import("@/features/auth/pages/OtpVerificationPage").then((m) => ({ Component: m.OtpVerificationPage }));
const loadForgotPasswordPage = () =>
  import("@/features/auth/pages/ForgotPasswordPage").then((m) => ({ Component: m.ForgotPasswordPage }));
const loadResetPasswordPage = () =>
  import("@/features/auth/pages/ResetPasswordPage").then((m) => ({ Component: m.ResetPasswordPage }));

// App pages
const loadDashboardPage = () =>
  import("@/features/dashboard/pages/DashboardPage").then((m) => ({ Component: m.DashboardPage }));
const loadClassesPage = () =>
  import("@/features/classes/pages/ClassesPage").then((m) => ({ Component: m.ClassesPage }));
const loadClassDetailPage = () =>
  import("@/features/classes/pages/ClassDetailPage").then((m) => ({ Component: m.ClassDetailPage }));
const loadExamsPage = () =>
  import("@/features/exams/pages/ExamsPage").then((m) => ({ Component: m.ExamsPage }));
const loadOmrTemplatePage = () =>
  import("@/features/templates/pages/OMRTemplatePage").then((m) => ({ Component: m.OMRTemplatePage }));
const loadTemplateBankPage = () =>
  import("@/features/templates/pages/TemplateBankPage").then((m) => ({ Component: m.TemplateBankPage }));
const loadQuestionBanksListPage = () =>
  import("@/features/questions/pages/QuestionBanksListPage").then((m) => ({ Component: m.QuestionBanksListPage }));
const loadQuestionBankDetailPage = () =>
  import("@/features/questions/pages/QuestionBankDetailPage").then((m) => ({ Component: m.QuestionBankDetailPage }));
const loadAccountSettingsPage = () =>
  import("@/features/settings/pages/AccountSettingsPage").then((m) => ({ Component: m.AccountSettingsPage }));

// Exam detail – layout + tabs
const loadExamDetailLayout = () =>
  import("@/features/exams/pages/ExamDetailLayout").then((m) => ({ Component: m.ExamDetailLayout }));
const loadExamInfoTab = () =>
  import("@/features/exams/pages/ExamInfoTab").then((m) => ({ Component: m.ExamInfoTab }));
const loadExamFormPage = () =>
  import("@/features/exams/pages/ExamFormPage").then((m) => ({ Component: m.ExamFormPage }));
const loadResultsTab = () =>
  import("@/features/grading/pages/ResultsPage").then((m) => ({ Component: m.ResultsPage }));
const loadResultDetailPage = () =>
  import("@/features/grading/pages/ResultDetailPage").then((m) => ({ Component: m.ResultDetailPage }));
const loadStatisticsTab = () =>
  import("@/features/statistics/pages/StatisticsPage").then((m) => ({ Component: m.StatisticsPage }));
const loadViolationsTab = () =>
  import("@/features/exams/pages/ExamViolationsTab").then((m) => ({ Component: m.ExamViolationsTab }));
const loadParticipantsTab = () =>
  import("@/features/exams/pages/ExamParticipantsTab").then((m) => ({ Component: m.ExamParticipantsTab }));

// ─── Redirect helpers ───────────────────────────────────────────────

const hydrateFallbackElement = (
  <div className="grid min-h-screen place-items-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

function LegacyExamQuestionsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/exams/${id}/edit?step=4`} replace />;
}

function LegacyResultsRedirect() {
  const { id, sheetId } = useParams();
  if (sheetId) return <Navigate to={`/exams/${id}/results/${sheetId}`} replace />;
  return <Navigate to={`/exams/${id}/results`} replace />; 
}

// ─── Router ────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public: Auth routes ──────────────────────────────────────────
  {
    Component: AuthLayout,
    hydrateFallbackElement,
    children: [
      { path: "/login", lazy: loadLoginPage },
      { path: "/register", lazy: loadRegisterPage },
      { path: "/otp-verification", lazy: loadOtpVerificationPage },
      { path: "/forgot-password", lazy: loadForgotPasswordPage },
      { path: "/reset-password", lazy: loadResetPasswordPage },
    ],
  },

  // ── Root redirect ────────────────────────────────────────────────
  {
    path: "/",
    hydrateFallbackElement,
    element: <Navigate to="/login" replace />,
  },

  // ── Protected: App routes ────────────────────────────────────────
  {
    Component: ProtectedRoute,
    hydrateFallbackElement,
    children: [
      {
        Component: RootLayout,
        hydrateFallbackElement,
        children: [
          // Dashboard & top-level pages
          { path: "/dashboard", lazy: loadDashboardPage },
          { path: "/classes", lazy: loadClassesPage },
          { path: "/classes/:id", lazy: loadClassDetailPage },

          // Exams list & creation
          { path: "/exams", lazy: loadExamsPage },
          { path: "/exams/create", lazy: loadExamFormPage },
          // Edit exam (độc lập, không trong tab layout)
          { path: "/exams/:id/edit", lazy: loadExamFormPage },

          // ── Exam detail layout với nested tabs ──────────────────
          {
            path: "/exams/:id",
            lazy: loadExamDetailLayout,
            children: [
              // Index → tab Thông tin
              { index: true, element: <Navigate to="info" replace /> },
              // Tab "Thông tin" – read-only overview
              { path: "info", lazy: loadExamInfoTab },
              { path: "participants", lazy: loadParticipantsTab },
              // Tab "Kết quả"
              { path: "results", lazy: loadResultsTab },
              // Tab "Thống kê"
              { path: "statistics", lazy: loadStatisticsTab },
              { path: "violations", lazy: loadViolationsTab },
            ],
          },

          // Chi tiết bài làm (không thuộc tab layout)
          { path: "/exams/:id/results/:sheetId", lazy: loadResultDetailPage },

          // Question banks
          { path: "/teacher/question-banks", lazy: loadQuestionBanksListPage },
          { path: "/teacher/question-banks/:bankId", lazy: loadQuestionBankDetailPage },

          // Templates
          { path: "/templates", lazy: loadTemplateBankPage },
          { path: "/templates/:templateId/edit", Component: OMRTemplateDesigner },

          // Settings
          { path: "/settings", lazy: loadAccountSettingsPage },

          // ── Legacy redirects ──────────────────────────────────
          { path: "/exams/:id/questions", Component: LegacyExamQuestionsRedirect },
          { path: "/exams/:id/answer-key", Component: LegacyExamQuestionsRedirect },
        ],
      },
    ],
  },

  // Template designer (fullscreen, không dùng RootLayout)
  {
    path: "/exams/:id/template",
    Component: OMRTemplateDesigner,
  },
]);
