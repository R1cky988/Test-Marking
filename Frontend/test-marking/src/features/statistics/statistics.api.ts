import axiosClient from "@/api/axiosClient";
import type { ApiSingleResponse } from "@/types/academic.types";
import type { ExamStatistics } from "./statistics.types";

/**
 * Lấy thống kê tổng quan của kỳ thi.
 * GET /web/exams/{examId}/statistics
 */
export async function getExamStatistics(examId: string): Promise<ExamStatistics> {
  const { data } = await axiosClient.get<ApiSingleResponse<ExamStatistics>>(
    `/web/exams/${examId}/statistics`,
  );
  return data.data;
}

/**
 * Trigger tính lại thống kê. Trả về 202 Accepted.
 * POST /web/exams/{examId}/statistics/recalculate
 */
export async function recalculateStatistics(
  examId: string,
): Promise<{ message: string }> {
  const { data } = await axiosClient.post<
    ApiSingleResponse<{ message: string }>
  >(`/web/exams/${examId}/statistics/recalculate`);
  return data.data;
}
