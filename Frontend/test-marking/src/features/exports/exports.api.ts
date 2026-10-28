import axiosClient from "@/api/axiosClient";
import type { ApiSingleResponse } from "@/types/academic.types";
import type {
  ExportResponse,
  ProcessedImagesExportJob,
} from "./exports.types";
import { resolveServerFileUrl } from "@/lib/resolveServerFileUrl";

function normalizeExportResponse(response: ExportResponse): ExportResponse {
  return {
    ...response,
    download_url: resolveServerFileUrl(response.download_url),
  };
}

function normalizeProcessedImagesExportJob(
  job: ProcessedImagesExportJob,
): ProcessedImagesExportJob {
  return {
    ...job,
    download_url: job.download_url
      ? resolveServerFileUrl(job.download_url)
      : null,
  };
}

/**
 * Xuất bảng điểm Excel.
 * POST /web/exams/{examId}/exports/scoreboard
 * Trả về { download_url: string }
 */
export async function exportScoreboard(
  examId: string,
): Promise<ExportResponse> {
  const { data } = await axiosClient.post<ApiSingleResponse<ExportResponse>>(
    `/web/exams/${examId}/exports/scoreboard`,
    {},
    { timeout: 60_000 }, // 60s timeout cho export
  );
  return normalizeExportResponse(data.data);
}

/**
 * Xuất PDF (ảnh visual debug) của một bài thi.
 * POST /web/answer-sheets/{sheetId}/exports/pdf
 * Trả về { download_url: string }
 */
export async function exportSheetPdf(sheetId: string): Promise<ExportResponse> {
  const { data } = await axiosClient.post<ApiSingleResponse<ExportResponse>>(
    `/web/answer-sheets/${sheetId}/exports/pdf`,
    {},
    { timeout: 30_000 },
  );
  return normalizeExportResponse(data.data);
}

export async function createProcessedImagesPdfExport(
  examId: string,
): Promise<ProcessedImagesExportJob> {
  const { data } = await axiosClient.post<
    ApiSingleResponse<ProcessedImagesExportJob>
  >(`/web/exams/${examId}/exports/processed-images-pdf`);
  return normalizeProcessedImagesExportJob(data.data);
}

export async function getProcessedImagesExportJob(
  jobId: string,
): Promise<ProcessedImagesExportJob> {
  const { data } = await axiosClient.get<
    ApiSingleResponse<ProcessedImagesExportJob>
  >(`/web/exports/jobs/${jobId}`);
  return normalizeProcessedImagesExportJob(data.data);
}

export async function retryProcessedImagesExportJob(
  jobId: string,
): Promise<ProcessedImagesExportJob> {
  const { data } = await axiosClient.post<
    ApiSingleResponse<ProcessedImagesExportJob>
  >(`/web/exports/jobs/${jobId}/retry`);
  return normalizeProcessedImagesExportJob(data.data);
}
