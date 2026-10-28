export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ClassStatus = "active" | "archived" | string;
export type ClassApprovalMode = "auto_approve" | "manual_approve" | "no_approval";
export type ClassMemberStatus = "pending" | "approved" | "rejected" | "leave_requested" | "left" | "removed";
export type ExamStatus = "draft" | "ready" | "scheduled" | "active" | "end" | "closed";
export type ExamType = "paper" | "online" | "hybrid";
export type GradingType = "TEACHER_GRADING" | "STUDENT_SUBMISSION";
export type ShuffleMode = "none" | "questions" | "choices" | "both";
export type IdentificationMode = "internal" | "external";
export type TemplateStatus = "draft" | "published" | "archived";
export type TemplateType = "standard" | "custom" | "legacy";

export interface Class {
  id: string;
  class_name: string;
  subject: string | null;
  description: string | null;
  class_code?: string | null;
  join_code: string;
  approval_mode: ClassApprovalMode;
  grade: string | null;
  school_year: string;
  status: ClassStatus;
  teacher_id: string | null;
  /** Role of the logged-in user IN THIS CLASS (decided per class, not per account) */
  my_role?: 'TEACHER' | 'STUDENT';
  /** true when the user created this class (= teacher of it) */
  is_teacher?: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Student {
  id: string;
  user_id: string;
  student_code: string;
  class_id: string | null;
  date_of_birth: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Exam {
  id: string;
  name: string;
  subject: string;
  duration: number;
  total_questions: number;
  score_scale: number;
  template_id: string | null;
  template?: Template | null;
  status: ExamStatus;
  exam_type: ExamType;
  grading_type: GradingType;
  active_session_count?: number;
  overdue_session_count?: number;
  start_time: string | null;
  end_time: string | null;
  identification_mode: IdentificationMode;
  online_config: JsonValue | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  parent_exam_id?: string | null;
  class_id?: string | null;
  class?: {
    id: string;
    class_name: string;
    class_code: string | null;
  } | null;
  instances?: Exam[];
  _count?: {
    examVersions?: number;
    answerSheets?: number;
    examAssignments?: number;
    examQuestions?: number;
  };
}

export interface OmrAnchorPoint {
  id: number;
  abs_x: number;
  abs_y: number;
  u: number;
  v: number;
}

export interface OmrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OmrAnswerZone {
  zone_id: string;
  type: "multiple_choice_grid";
  bounding_box: OmrBoundingBox;
  layout: {
    rows: number;
    options: number;
    has_start_number: boolean;
    has_end_number: boolean;
    start_question_index?: number;
  };
}

export interface OmrIdZoneItem {
  type: "student_id" | "class_code" | "exam_code";
  enabled: boolean;
  num_digits: number;
}

export interface OmrIdZone {
  bounding_box: OmrBoundingBox;
  items: OmrIdZoneItem[];
}

export interface OmrFixedZoneItem {
  type: "full_name" | "class_name" | "subject" | "exam_date";
  enabled: boolean;
  label: string;
}

export interface OmrFixedZones {
  bounding_box: OmrBoundingBox;
  items: OmrFixedZoneItem[];
}

export interface OmrGridConfig {
  anchor_points?: OmrAnchorPoint[];
  fixed_zones?: OmrFixedZones | JsonValue[];
  number_zones?: JsonValue[];
  id_zones?: OmrIdZone;
  answer_zones: OmrAnswerZone[];
}

export interface Template {
  id: string;
  name: string;
  version: string;
  base_image_url: string | null;
  preview_image_url: string | null;
  anchor_points: OmrAnchorPoint[];
  grid_config: OmrGridConfig;
  template_type: TemplateType;
  status: TemplateStatus;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  exam_id: string;
  question_bank_item_id?: string | null;
  order_index: number;
  content: string;
  attachments: JsonValue | null;
  explanation: string | null;
  options: QuestionOption[];
  correct_answer?: string | string[] | null;
  difficulty?: string | null;
  topic?: string | null;
  snapshot?: JsonValue | null;
}

export interface QuestionInput {
  id?: string;
  content: string;
  attachments?: JsonValue;
  explanation?: string;
  options: Array<{
    id?: string;
    content: string;
    is_correct: boolean;
    order_index?: number;
  }>;
}

export type AnswerKeyValue = string | string[];

export interface ExamVersion {
  id: string;
  exam_id: string;
  version_code: string;
  answer_key: Record<string, AnswerKeyValue>;
  question_order: string[] | null;
  choice_permutation: Record<string, number[]> | null;
  shuffle_mode: ShuffleMode;
  created_at: string | null;
  updated_at: string | null;
}

export interface GenerateExamVersionsPayload {
  count: number;
  shuffle_mode?: ShuffleMode;
  reset_versions?: boolean;
}

export interface GenerateExamQuestionsPayload {
  bank_id?: string;
  count: number;
  difficulty?: string;
  topic?: string;
  manual?: boolean;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface GenerateVersionsFromBankPayload {
  bankId: string;
  versionCount?: number;
  difficultyDistribution?: DifficultyDistribution;
  versionConfigs?: Array<{ versionCode: string } & DifficultyDistribution>;
  topic?: string;
  shuffleMode?: Extract<ShuffleMode, "questions" | "both">;
  shuffleQuestions?: boolean;
}

export interface ExportAllExamResponse {
  download_url: string;
  filename: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  items_count: number;
  difficulty_counts: DifficultyDistribution;
  created_at: string | null;
  updated_at: string | null;
} 

export interface OnlineConfigDTO {
  start_time: string;
  end_time: string;
  is_locked_mode?: boolean;
  max_attempts?: number;
  lock_config?: Record<string, JsonValue>;
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  class_id: string;
  class?: {
    id: string;
    class_name: string;
    class_code: string | null;
    join_code: string | null;
    grade: string | null;
    school_year: string | null;
  } | null;
  start_time: string;
  end_time: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiSingleResponse<T> {
  data: T;
}

export type ClassListItem = Class & {
  student_count: number;
};

export interface ClassMember {
  id: string;
  class_id: string;
  student_id: string;
  internal_id: string;
  status: ClassMemberStatus;
  joined_at: string | null;
  approved_at: string | null;
  left_at?: string | null;
  removed_at?: string | null;
  remove_reason?: string | null;
  created_at: string | null;
  updated_at: string | null;
  student_code: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface ClassMemberProfile extends ClassMember {
  is_active: boolean | null;
  class: {
    id: string;
    class_name: string;
    subject: string | null;
    grade: string | null;
    school_year: string | null;
  };
  exam_summary: {
    assigned: number;
    submitted: number;
    average_score: number | null;
  };
}

export type ClassStudent = Student & {
  full_name: string;
  email: string;
  is_active: boolean;
};

export interface ImportStudentError {
  row: number;
  reason: string;
}

export interface ImportStudentsResult {
  imported: number;
  skipped: number;
  errors: ImportStudentError[];
}

export interface CreateClassPayload {
  class_name: string;
  subject?: string | null;
  description?: string | null;
  approval_mode?: ClassApprovalMode;
}

export type UpdateClassPayload = Partial<CreateClassPayload>;

export interface CreateStudentPayload {
  full_name: string;
  email: string;
  student_code?: string | null;
  date_of_birth?: string;
}

export interface CreateExamPayload {
  name: string;
  subject: string;
  duration: number;
  total_questions: number;
  score_scale?: number;
  template_id?: string;
  answer_key?: Record<string, AnswerKeyValue>;
  class_id?: string;
  class_ids?: string[];
  identification_mode?: IdentificationMode;
  exam_type?: ExamType;
  grading_type?: GradingType;
  start_time?: string;
  end_time?: string;
}

export type UpdateExamPayload = Partial<CreateExamPayload>;

export interface CreateTemplatePayload {
  name: string;
  anchor_points: OmrAnchorPoint[];
  grid_config: OmrGridConfig;
  template_type?: TemplateType;
}

export interface CreateExamAssignmentPayload {
  class_ids: string[];
  start_time: string;
  end_time: string;
}
