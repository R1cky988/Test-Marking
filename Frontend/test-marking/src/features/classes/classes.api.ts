import axiosClient from "@/api/axiosClient";
import type {
  ApiSingleResponse,
  Class,
  ClassApprovalMode,
  ClassListItem,
  ClassMember,
  ClassMemberProfile,
  ClassMemberStatus,
  ClassStudent,
  CreateClassPayload,
  CreateStudentPayload,
  ImportStudentsResult,
  PaginatedResponse,
  UpdateClassPayload,
} from "@/types/academic.types";


export interface JoinClassPayload {
  join_code: string;
  message?: string;
}

export interface JoinClassResult {
  status: string;
  [key: string]: unknown;
}


interface RawClass {
  id: string;
  className?: string;
  class_name?: string;
  subject?: string | null;
  description?: string | null;
  classCode?: string;
  class_code?: string;
  joinCode?: string;
  join_code?: string;
  approvalMode?: string;
  approval_mode?: string;
  grade?: string | null;
  schoolYear?: string;
  school_year?: string;
  status: string;
  teacherId?: string | null;
  teacher_id?: string | null;
  my_role?: string;
  is_teacher?: boolean;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  /** Spring list/detail endpoints send the count directly */
  student_count?: number;
  _count?: {
    students?: number;
    classMembers?: number;
    class_members?: number;
  };
}

interface RawClassMember {
  id: string;
  classId?: string;
  class_id?: string;
  studentId?: string;
  student_id?: string;
  internalId?: string;
  internal_id?: string;
  studentCode?: string | null;
  student_code?: string | null;
  status: string;
  joinedAt?: string | null;
  joined_at?: string | null;
  approvedAt?: string | null;
  approved_at?: string | null;
  leftAt?: string | null;
  left_at?: string | null;
  removedAt?: string | null;
  removed_at?: string | null;
  removeReason?: string | null;
  remove_reason?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  student?: {
    id?: string;
    studentCode?: string | null;
    student_code?: string | null;
    user?: {
      fullName?: string;
      full_name?: string;
      email?: string;
      avatarUrl?: string | null;
      avatar_url?: string | null;
    };
  };
}

interface RawClassStudent {
  id: string;
  userId?: string;
  user_id?: string;
  studentCode?: string;
  student_code?: string;
  classId?: string | null;
  currentClassId?: string | null;
  class_id?: string | null;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  fullName?: string;
  full_name?: string;
  email?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface ClassQueryParams {
  /** classes I teach (created) / classes I study in (joined); default all */
  role?: "teacher" | "student";
  status?: string;
  school_year?: string;
  page?: number;
  limit?: number;
}

export interface StudentQueryParams {
  student_code?: string;
  full_name?: string;
  page?: number;
  limit?: number;
}

export interface ClassMemberQueryParams {
  status?: ClassMemberStatus | "all" | string;
  search?: string;
  page?: number;
  limit?: number;
}

function normalizeDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeApprovalMode(value: string | undefined | null): ClassApprovalMode {
  return String(value ?? "AUTO_APPROVE").toLowerCase() as ClassApprovalMode;
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizeMemberStatus(value: string | undefined | null): ClassMemberStatus {
  return String(value ?? "PENDING").toLowerCase() as ClassMemberStatus;
}

function toBackendMemberStatus(value?: ClassMemberStatus | "all" | string) {
  if (!value || value === "all") return undefined;
  return value.toUpperCase();
}

function normalizeClass(raw: RawClass): ClassListItem {
  return {
    id: raw.id,
    class_name: raw.class_name ?? raw.className ?? "",
    subject: cleanOptionalText(raw.subject),
    description: cleanOptionalText(raw.description),
    class_code: raw.class_code ?? raw.classCode ?? "",
    join_code: raw.join_code ?? raw.joinCode ?? "",
    approval_mode: normalizeApprovalMode(raw.approval_mode ?? raw.approvalMode),
    grade: cleanOptionalText(raw.grade),
    school_year: raw.school_year ?? raw.schoolYear ?? "",
    status: raw.status,
    teacher_id: raw.teacher_id ?? raw.teacherId ?? null,
    my_role: raw.my_role === "TEACHER" ? "TEACHER" : raw.my_role === "STUDENT" ? "STUDENT" : undefined,
    is_teacher: raw.is_teacher ?? raw.my_role === "TEACHER",
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
    student_count: raw.student_count ?? raw._count?.classMembers ?? raw._count?.class_members ?? raw._count?.students ?? 0,
  };
}

function normalizeClassMember(raw: RawClassMember): ClassMember {
  const user = raw.student?.user;
  return {
    id: raw.id,
    class_id: raw.class_id ?? raw.classId ?? "",
    student_id: raw.student_id ?? raw.studentId ?? raw.student?.id ?? "",
    internal_id: raw.internal_id ?? raw.internalId ?? "",
    status: normalizeMemberStatus(raw.status),
    joined_at: normalizeDate(raw.joined_at ?? raw.joinedAt),
    approved_at: normalizeDate(raw.approved_at ?? raw.approvedAt),
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
    left_at: normalizeDate(raw.left_at ?? raw.leftAt),
    removed_at: normalizeDate(raw.removed_at ?? raw.removedAt),
    remove_reason: raw.remove_reason ?? raw.removeReason ?? null,
    student_code: raw.student_code ?? raw.studentCode ?? raw.student?.student_code ?? raw.student?.studentCode ?? "",
    full_name: user?.full_name ?? user?.fullName ?? "",
    email: user?.email ?? "",
    avatar_url: user?.avatar_url ?? user?.avatarUrl ?? null,
  };
}

function normalizeStudent(raw: RawClassStudent): ClassStudent {
  return {
    id: raw.id,
    user_id: raw.user_id ?? raw.userId ?? "",
    student_code: raw.student_code ?? raw.studentCode ?? "",
    class_id: raw.class_id ?? raw.currentClassId ?? raw.classId ?? null,
    date_of_birth: normalizeDate(raw.date_of_birth ?? raw.dateOfBirth),
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
    full_name: raw.full_name ?? raw.fullName ?? "",
    email: raw.email ?? "",
    is_active: raw.is_active ?? raw.isActive ?? true,
  };
}

function toBackendClassPayload(payload: CreateClassPayload | UpdateClassPayload) {
  // Spring backend: snake_case. Only keys that were given are sent, so an update never wipes fields by accident.
  const body: Record<string, unknown> = {};
  if (payload.class_name !== undefined) body.class_name = payload.class_name.trim();
  if (payload.subject !== undefined) body.subject = cleanOptionalText(payload.subject);
  if (payload.description !== undefined) body.description = cleanOptionalText(payload.description);
  if (payload.approval_mode !== undefined) body.approval_mode = payload.approval_mode;
  return body;
}

function toBackendStudentPayload(payload: CreateStudentPayload) {
  return {
    fullName: payload.full_name.trim(),
    email: payload.email.trim(),
    studentCode: cleanOptionalText(payload.student_code) ?? undefined,
    dateOfBirth: payload.date_of_birth || undefined,
  };
}

export async function getClasses(params: ClassQueryParams = {}): Promise<PaginatedResponse<ClassListItem>> {
  const { data } = await axiosClient.get<PaginatedResponse<RawClass>>("/classes", {
    params: {
      status: params.status,
      role: params.role,
      school_year: params.school_year,
      page: params.page,
      limit: params.limit,
    },
  });

  return {
    data: data.data.map(normalizeClass),
    meta: data.meta,
  };
}

export async function getClass(classId: string): Promise<ClassListItem> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawClass>>(`/classes/${classId}`);
  return normalizeClass(data.data);
}

export async function createClass(payload: CreateClassPayload): Promise<Class> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClass>>(
    "/classes",
    toBackendClassPayload(payload),
  );
  return normalizeClass(data.data);
}

export async function updateClass(classId: string, payload: UpdateClassPayload): Promise<Class> {
  const { data } = await axiosClient.put<ApiSingleResponse<RawClass>>(
    `/classes/${classId}`,
    toBackendClassPayload(payload),
  );
  return normalizeClass(data.data);
}

export async function deleteClass(classId: string): Promise<Class> {
  const { data } = await axiosClient.delete<ApiSingleResponse<RawClass>>(`/classes/${classId}`);
  return normalizeClass(data.data);
}

export async function restoreClass(classId: string): Promise<Class> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClass>>(`/classes/${classId}/restore`);
  return normalizeClass(data.data);
}

export async function getClassStudents(
  classId: string,
  params: StudentQueryParams = {},
): Promise<PaginatedResponse<ClassStudent>> {
  const { data } = await axiosClient.get<PaginatedResponse<RawClassStudent>>(
    `/classes/${classId}/students`,
    {
      params: {
        studentCode: params.student_code,
        fullName: params.full_name,
        page: params.page,
        limit: params.limit,
      },
    },
  );

  return {
    data: data.data.map(normalizeStudent),
    meta: data.meta,
  };
}

export async function getClassMembers(
  classId: string,
  params: ClassMemberQueryParams = {},
): Promise<PaginatedResponse<ClassMember>> {
  const { data } = await axiosClient.get<PaginatedResponse<RawClassMember>>(
    `/classes/${classId}/members`,
    {
      params: {
        status: toBackendMemberStatus(params.status),
        search: params.search || undefined,
        page: params.page,
        limit: params.limit,
      },
    },
  );

  return {
    data: data.data.map(normalizeClassMember),
    meta: data.meta,
  };
}

export async function approveMembers(classId: string, memberIds: string[]): Promise<{ approved: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<{ approved: number }>>(
    `/classes/${classId}/members/approve`,
    { memberIds },
  );
  return data.data;
}

export async function rejectMembers(classId: string, memberIds: string[]): Promise<{ rejected: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<{ rejected: number }>>(
    `/classes/${classId}/members/reject`,
    { memberIds },
  );
  return data.data;
}

export async function getMemberProfile(classId: string, memberId: string): Promise<ClassMemberProfile> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawClassMember & {
    full_name?: string;
    email?: string;
    avatar_url?: string | null;
    is_active?: boolean | null;
    class?: ClassMemberProfile["class"];
    exam_summary?: ClassMemberProfile["exam_summary"];
  }>>(`/classes/${classId}/members/${memberId}/profile`);
  const raw = data.data;
  const normalized = normalizeClassMember(raw);
  return {
    ...normalized,
    full_name: raw.full_name ?? normalized.full_name,
    email: raw.email ?? normalized.email,
    avatar_url: raw.avatar_url ?? normalized.avatar_url,
    is_active: raw.is_active ?? null,
    class: raw.class ?? { id: classId, class_name: "", subject: null, grade: null, school_year: null },
    exam_summary: raw.exam_summary ?? { assigned: 0, submitted: 0, average_score: null },
  };
}

export async function removeMember(classId: string, memberId: string, reason?: string): Promise<ClassMember> {
  const { data } = await axiosClient.delete<ApiSingleResponse<RawClassMember>>(
    `/classes/${classId}/members/${memberId}`,
    { data: { reason } },
  );
  return normalizeClassMember(data.data);
}

export async function approveLeaveRequest(classId: string, memberId: string): Promise<ClassMember> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClassMember>>(
    `/classes/${classId}/members/${memberId}/approve-leave`,
  );
  return normalizeClassMember(data.data);
}

export async function rejectLeaveRequest(classId: string, memberId: string): Promise<ClassMember> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClassMember>>(
    `/classes/${classId}/members/${memberId}/reject-leave`,
  );
  return normalizeClassMember(data.data);
}

export async function regenerateJoinCode(classId: string): Promise<ClassListItem> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClass>>(
    `/classes/${classId}/join-code`,
  );
  return normalizeClass(data.data);
}

export async function createStudent(
  classId: string,
  payload: CreateStudentPayload,
): Promise<ClassStudent & { password?: string }> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawClassStudent & { password?: string }>>(
    `/classes/${classId}/students`,
    toBackendStudentPayload(payload),
  );

  return {
    ...normalizeStudent(data.data),
    password: data.data.password,
  };
}

export async function importStudentsExcel(file: File): Promise<ImportStudentsResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axiosClient.post<ApiSingleResponse<ImportStudentsResult>>(
    "/students/import",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.data;
}

/**
 * Import học sinh vào lớp từ file Excel.
 * POST /classes/:classId/students/import
 */
export async function importStudentsToClass(
  classId: string,
  file: File,
): Promise<ImportStudentsResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axiosClient.post<ApiSingleResponse<ImportStudentsResult>>(
    `/classes/${classId}/students/import`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return data.data;
}

// ─── Class Exam type ──────────────────────────────────────────────

export interface ClassExam {
  assignment_id: string;
  id: string;
  name: string;
  subject: string;
  duration: number;
  totalQuestions: number;
  status: string;
  examType: string;
  createdAt: string | null;
  start_time: string | null;
  end_time: string | null;
}

/**
 * Lấy danh sách kỳ thi được gán cho lớp.
 * GET /classes/:classId/exams
 */
export async function getClassExams(classId: string): Promise<ClassExam[]> {
  const { data } = await axiosClient.get<{ data: ClassExam[] }>(
    `/classes/${classId}/exams`,
  );
  return data.data;
}


export async function joinClassByCode(
  payload: JoinClassPayload,
): Promise<JoinClassResult> {
  const { data } = await axiosClient.post<{ data: JoinClassResult }>(
    "/classes/join",
    {
      join_code: payload.join_code.trim(),
      message: payload.message?.trim() || undefined,
    },
  );

  return data.data;
}
