import axiosClient from "@/api/axiosClient";

export type AppealStatus = "PENDING" | "REVIEWED" | "ACCEPTED";

export interface AppealItem {
  id: string;
  message?: string;
  teacher_response?: string | null;
  status: AppealStatus;
}

export interface Appeal {
  id: string;
  status: AppealStatus;
  reason: string;
  teacher_note?: string | null;
  old_score: number;
  new_score?: number | null;
  created_at?: string | null;
  student: {
    id: string;
    name: string;
    code?: string | null;
  };
  exam: {
    id: string;
    name: string;
    subject?: string | null;
  };
  sheet: {
    id: string;
    submission_id?: string | null;
    source?: string | null;
    total_score: number;
    processed_image_url?: string | null;
    dewarped_image_url?: string | null;
    class_code?: string | null;
    exam_code?: string | null;
    submission_mode?: string | null;
    offline_verified?: boolean;
    received_at?: string | null;
    security_flags?: Record<string, unknown> | null;
    exam_version?: {
      id: string;
      version_code: string;
    } | null;
  };
  original_submission?: AppealImageResult | null;
  reviewed_result?: AppealImageResult | null;
  regradeSnapshots?: AppealImageResult[];
  items: AppealItem[];
}

export interface AppealImageResult {
  id?: string;
  sheet_id?: string;
  raw_image_url?: string | null;
  dewarped_image_url?: string | null;
  processed_image_url?: string | null;
  previous_raw_image_url?: string | null;
  previous_dewarped_image_url?: string | null;
  previous_processed_image_url?: string | null;
  detail_endpoint?: string | null;
  created_at?: string | null;
}

export interface AppealsResponse {
  data: Appeal[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export async function getAppeals(
  params: {
    status?: AppealStatus;
    exam_id?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await axiosClient.get<AppealsResponse>("/web/appeals", {
    params,
  });
  return data;
}

export async function getAppeal(appealId: string) {
  const { data } = await axiosClient.get<{ data: Appeal }>(
    `/web/appeals/${appealId}`,
  );
  return data.data;
}

export async function resolveAppeal(
  appealId: string,
  payload: {
    status: "REVIEWED";
    teacher_note?: string;
    item_responses?: Record<string, string>;
  },
) {
  const { data } = await axiosClient.put<{ data: Appeal }>(
    `/web/appeals/${appealId}/resolve`,
    payload,
  );
  return data.data;
}
