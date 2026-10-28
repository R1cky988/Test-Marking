import axiosClient from "@/api/axiosClient";

export interface DashboardSummary {
  stats: {
    class_count: number;
    active_exam_count: number;
    pending_close_exams: number;
    upcoming_exam_count: number;
  };
  recent_exams: Array<{
    id: string;
    name: string;
    status: string;
    grading_type: string;
    due_date: string | null;
    classes_label: string;
    submission_count: number;
    student_count: number;
  }>;
  degraded?: boolean;
  warnings?: string[];
}

export async function getDashboardSummary() {
  const { data } = await axiosClient.get<{ data: DashboardSummary }>("/web/dashboard/summary");
  return data.data;
}
