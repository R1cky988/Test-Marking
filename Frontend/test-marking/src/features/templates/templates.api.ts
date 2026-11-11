import axiosClient from "@/api/axiosClient";
import type {
  ApiSingleResponse,
  CreateTemplatePayload,
  OmrAnchorPoint,
  OmrGridConfig,
  Template,
  TemplateStatus,
  TemplateType,
} from "@/types/academic.types";

type BackendTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type BackendTemplateType = "STANDARD" | "CUSTOM" | "LEGACY";

interface RawTemplate {
  id?: string;
  /** the Spring TestLayout exposes its public id as `uuid` */
  uuid?: string;
  name: string;
  version: string;
  baseImageUrl?: string | null;
  base_image_url?: string | null;
  previewImageUrl?: string | null;
  preview_image_url?: string | null;
  anchorPoints?: OmrAnchorPoint[];
  anchor_points?: OmrAnchorPoint[];
  gridConfig?: OmrGridConfig;
  grid_config?: OmrGridConfig;
  templateType?: BackendTemplateType | TemplateType;
  template_type?: BackendTemplateType | TemplateType;
  status?: BackendTemplateStatus | TemplateStatus;
  createdById?: string | null;
  created_by?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  sheet_code?: string | null;
}

interface TemplateListResponse {
  data: RawTemplate[];
}

export interface TemplateQueryParams {
  status?: TemplateStatus;
}

function normalizeDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeTemplateType(value?: BackendTemplateType | TemplateType): TemplateType {
  return String(value ?? "STANDARD").toLowerCase() as TemplateType;
}

function normalizeTemplateStatus(value?: BackendTemplateStatus | TemplateStatus): TemplateStatus {
  return String(value ?? "PUBLISHED").toLowerCase() as TemplateStatus;
}

function toBackendTemplateType(value?: TemplateType): BackendTemplateType | undefined {
  return value ? (value.toUpperCase() as BackendTemplateType) : undefined;
}

function toBackendTemplateStatus(value?: TemplateStatus): BackendTemplateStatus | undefined {
  return value ? (value.toUpperCase() as BackendTemplateStatus) : undefined;
}

export function normalizeTemplate(raw: RawTemplate): Template {
  return {
    id: (raw.id ?? raw.uuid) as string,
    name: raw.name,
    version: raw.version,
    base_image_url: raw.base_image_url ?? raw.baseImageUrl ?? null,
    preview_image_url: raw.preview_image_url ?? raw.previewImageUrl ?? null,
    anchor_points: raw.anchor_points ?? raw.anchorPoints ?? [],
    grid_config: raw.grid_config ?? raw.gridConfig ?? { answer_zones: [] },
    template_type: normalizeTemplateType(raw.template_type ?? raw.templateType),
    status: normalizeTemplateStatus(raw.status),
    created_by: raw.created_by ?? raw.createdById ?? null,
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
    sheet_code: raw.sheet_code ?? null,
  };
}

export async function getTemplates(params: TemplateQueryParams = {}): Promise<Template[]> {
  const { data } = await axiosClient.get<TemplateListResponse>("/templates", {
    params: { status: toBackendTemplateStatus(params.status) },
  });
  return data.data.map(normalizeTemplate);
}

export async function getTemplate(templateId: string): Promise<Template> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawTemplate>>(`/templates/${templateId}`);
  return normalizeTemplate(data.data);
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<Template> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawTemplate>>("/templates", {
    name: payload.name,
    anchor_points: payload.anchor_points,
    grid_config: payload.grid_config,
    template_type: toBackendTemplateType(payload.template_type),
  });
  return normalizeTemplate(data.data);
}

export async function updateTemplate(templateId: string, payload: CreateTemplatePayload): Promise<Template> {
  const { data } = await axiosClient.put<ApiSingleResponse<RawTemplate>>(`/templates/${templateId}`, {
    name: payload.name,
    anchor_points: payload.anchor_points,
    grid_config: payload.grid_config,
    template_type: toBackendTemplateType(payload.template_type),
  });
  return normalizeTemplate(data.data);
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await axiosClient.delete(`/templates/${templateId}`);
}

export async function downloadTemplateAsset(templateId: string): Promise<Blob> {
  const { data } = await axiosClient.get(`/templates/${templateId}/download`, {
    responseType: "blob",
  });
  return data;
}

export async function getTemplateImage(templateId: string): Promise<Blob> {
  const { data } = await axiosClient.get(`/templates/${templateId}/image`, { responseType: "blob" });
  return data instanceof Blob ? data : new Blob([data as BlobPart], { type: "image/svg+xml" });
}