import axiosClient from "@/api/axiosClient";
import type { ReactionSummary } from "./reactions.api";

// Endpoints of the Spring ClassController / ClassPostController / ClassDocumentController.
// The backend answers in snake_case, wrapped as { status, message, data }.

export interface Person {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ClassInfo {
  id: string;
  class_name: string;
  class_code: string | null;
  subject: string | null;
  description: string | null;
  status: "active" | "archived";
  student_count: number;
  my_role: "TEACHER" | "STUDENT";
  is_teacher: boolean;
  teacher: Person | null;
  /** teacher only */
  join_code?: string | null;
  require_join_approval?: boolean;
  pending_request_count?: number;
}

export interface Roster {
  teachers: (Person & { role: "TEACHER"; email?: string })[];
  students: (Person & { student_code: string | null; joined_at: string | null; email?: string })[];
  student_count: number;
}

export type ExamBucket = "draft" | "upcoming" | "ongoing" | "ended";

export interface ClassExamItem {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  bucket: ExamBucket;
  format: string | null;
  from_time: string | null;
  to_time: string | null;
  duration_minutes: number | null;
  is_score_published?: boolean;
}

export interface ClassExamGroups {
  upcoming: ClassExamItem[];
  ongoing: ClassExamItem[];
  ended: ClassExamItem[];
  /** teacher only */
  draft?: ClassExamItem[];
}

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface JoinRequest {
  id: string;
  student: { id?: string; name?: string; email?: string; avatar_url?: string | null; student_code?: string | null };
  message: string | null;
  status: JoinRequestStatus;
  rejection_reason: string | null;
  created_at: string | null;
  processed_at: string | null;
}

export interface ClassFile {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number;
  post_id: string | null;
  uploaded_by: Person | null;
  created_at: string | null;
  can_delete: boolean;
}

export interface PostComment {
  id: string;
  parent_id: string | null;
  author: Person | null;
  content: string;
  is_hidden: boolean;
  created_at: string | null;
  updated_at: string | null;
  can_edit: boolean;
  can_delete: boolean;
  can_hide: boolean;
  reactions: ReactionSummary;
}

export type PostType = "POST" | "ANNOUNCEMENT";
export type PostStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface ClassPostItem {
  id: string;
  type: PostType;
  status: PostStatus;
  title: string | null;
  content: string;
  allow_comments: boolean;
  is_pinned: boolean;
  author: Person | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** the author */
  can_edit: boolean;
  /** the author or the teacher of the class */
  can_delete?: boolean;
  /** teacher of the class: pin / close comments */
  can_moderate?: boolean;
  attachments: ClassFile[];
  comments: PostComment[];
  comment_count: number;
  reactions: ReactionSummary;
}

export interface PostInput {
  content: string;
  title?: string | null;
  type?: PostType;
  status?: PostStatus;
  allow_comments?: boolean;
  is_pinned?: boolean;
}

type Wrapped<T> = { data: T };
const base = (classId: string) => `/classes/${classId}`;

export const getClassInfo = async (classId: string) =>
  (await axiosClient.get<Wrapped<ClassInfo>>(base(classId))).data.data;

export const regenerateJoinCode = async (classId: string) =>
  (await axiosClient.post<Wrapped<{ join_code: string }>>(`${base(classId)}/join-code`)).data.data;

export const getRoster = async (classId: string) =>
  (await axiosClient.get<Wrapped<Roster>>(`${base(classId)}/members`)).data.data;

export const removeStudent = async (classId: string, studentId: string) => {
  await axiosClient.delete(`${base(classId)}/members/${studentId}`);
};

export const getClassExamGroups = async (classId: string) =>
  (await axiosClient.get<Wrapped<ClassExamGroups>>(`${base(classId)}/exams`)).data.data;

export const joinClassByCode = async (joinCode: string, message?: string) =>
  (
    await axiosClient.post<Wrapped<{ class_id: string; class_name: string; status: "JOINED" | "PENDING" }>>(
      "/classes/join",
      { join_code: joinCode, message: message || undefined },
    )
  ).data.data;

export const getJoinRequests = async (classId: string, status: JoinRequestStatus | "ALL" = "PENDING") =>
  (
    await axiosClient.get<Wrapped<JoinRequest[]>>(`${base(classId)}/join-requests`, {
      params: status === "ALL" ? {} : { status },
    })
  ).data.data;

export const approveJoinRequest = async (classId: string, requestId: string) => {
  await axiosClient.post(`${base(classId)}/join-requests/${requestId}/approve`);
};

export const rejectJoinRequest = async (classId: string, requestId: string, reason?: string) => {
  await axiosClient.post(`${base(classId)}/join-requests/${requestId}/reject`, { reason: reason || undefined });
};

// posts
export const getPosts = async (classId: string) =>
  (await axiosClient.get<Wrapped<ClassPostItem[]>>(`${base(classId)}/posts`)).data.data;

export const createPost = async (classId: string, input: PostInput) =>
  (await axiosClient.post<Wrapped<ClassPostItem>>(`${base(classId)}/posts`, input)).data.data;

export const updatePost = async (classId: string, postId: string, input: Partial<PostInput>) =>
  (await axiosClient.put<Wrapped<ClassPostItem>>(`${base(classId)}/posts/${postId}`, input)).data.data;

export const deletePost = async (classId: string, postId: string) => {
  await axiosClient.delete(`${base(classId)}/posts/${postId}`);
};

// comments
export const addComment = async (classId: string, postId: string, content: string, parentCommentId?: string) =>
  (
    await axiosClient.post<Wrapped<PostComment>>(`${base(classId)}/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentCommentId,
    })
  ).data.data;

export const updateComment = async (classId: string, commentId: string, content: string) =>
  (await axiosClient.put<Wrapped<PostComment>>(`${base(classId)}/comments/${commentId}`, { content })).data.data;

export const deleteComment = async (classId: string, commentId: string) => {
  await axiosClient.delete(`${base(classId)}/comments/${commentId}`);
};

export const setCommentHidden = async (classId: string, commentId: string, hidden: boolean) => {
  await axiosClient.post(`${base(classId)}/comments/${commentId}/${hidden ? "hide" : "unhide"}`);
};

// files
export const getFiles = async (classId: string) =>
  (await axiosClient.get<Wrapped<ClassFile[]>>(`${base(classId)}/documents`)).data.data;

export const uploadFile = async (
  classId: string,
  file: File,
  opts: { title?: string; description?: string; postId?: string } = {},
) => {
  const form = new FormData();
  form.append("file", file);
  if (opts.title) form.append("title", opts.title);
  if (opts.description) form.append("description", opts.description);
  if (opts.postId) form.append("post_id", opts.postId);
  return (
    await axiosClient.post<Wrapped<ClassFile>>(`${base(classId)}/documents`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data.data;
};

export const deleteFile = async (classId: string, fileId: string) => {
  await axiosClient.delete(`${base(classId)}/documents/${fileId}`);
};

/** Downloads through axios so the Authorization header is sent (a plain <a href> would not carry it). */
export async function downloadFile(classId: string, file: Pick<ClassFile, "id" | "file_name">) {
  const res = await axiosClient.get<Blob>(`${base(classId)}/documents/${file.id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Excel import of a class's students (teacher of the class) ───
// .xlsx with the columns STT, Name, Registed Email. New e-mails get an account whose login is E-MAILED to them;
// e-mails that already have an account are not recreated but are added to the class. The server never returns passwords.

export type ImportRowStatus = "CREATED" | "EXISTS_ADDED" | "EXISTS_IN_CLASS" | "INVALID_EMAIL" | "DUPLICATE_IN_FILE" | "EMAIL_FAILED" | "FAILED";

export interface ImportRow {
  row: number;
  name: string;
  email: string;
  status: ImportRowStatus;
  message: string;
}

export interface ImportStudentsOutcome {
  total_rows: number;
  created: number;
  skipped_existing: number;
  invalid: number;
  failed: number;
  rows: ImportRow[];
}

export async function importStudents(classId: string, file: File): Promise<ImportStudentsOutcome> {
  const form = new FormData();
  form.append("file", file);
  return (
    await axiosClient.post<Wrapped<ImportStudentsOutcome>>(`${base(classId)}/students/import`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data.data;
}

function csvCell(value: string | number): string {
  const text = String(value);
  // a cell starting with = + - @ would run as a formula when the teacher opens the file in Excel
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** UTF-8 with BOM so Excel shows Vietnamese correctly. */
export function toCsv(rows: (string | number)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function saveTextFile(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Header + one example row of the Excel template. */
export const IMPORT_TEMPLATE_ROWS: string[][] = [
  ["STT", "Name", "Registed Email"],
  ["1", "Nguyễn Văn An", "an.nguyen@example.com"],
];
