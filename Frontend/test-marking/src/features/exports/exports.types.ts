// ─── Export Response ─────────────────────────────────────────────

export interface ExportResponse {
  download_url: string;
}

export type ExportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface ProcessedImagesExportJob {
  id: string;
  exam_id: string;
  status: ExportJobStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  progress: number;
  download_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
