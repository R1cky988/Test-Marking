// ─── Score Distribution ──────────────────────────────────────────

export interface ScoreDistributionBin {
  range: string;
  count: number;
  min: number;
  max: number;
}

// ─── Item Analysis ───────────────────────────────────────────────

export interface AnswerDistribution {
  [option: string]: number;
}

export interface QuestionAnalysis {
  question_number: number;
  correct_answer: string;
  correct_rate: number;
  total_answers: number;
  correct_count: number;
  answer_distribution: AnswerDistribution;
}

export interface VersionQuestionAnalysis {
  exam_version_id: string | null;
  version_code: string;
  total_sheets: number;
  item_analysis: QuestionAnalysis[];
}

// ─── Submission Errors ───────────────────────────────────────────

export interface SubmissionError {
  sheet_id: string;
  student_name: string;
  student_code: string;
  error_type: string;
  error_detail: string;
  processed_image_url: string | null;
}

// ─── Overview ────────────────────────────────────────────────────

export interface ExamStatisticsOverview {
  assigned_count: number;
  total_submissions: number;
  graded_count: number;
  ungraded_count: number;
  error_count: number;
  average_score: number;
  max_score: number;
  min_score: number;
  below_average_count: number;
  below_average_rate: number;
}

// ─── Full Statistics ─────────────────────────────────────────────

export interface ExamStatistics {
  exam_id: string;
  exam_name: string;
  subject: string;
  grading_type: "TEACHER_GRADING" | "STUDENT_SUBMISSION";
  score_scale: number;
  overview: ExamStatisticsOverview;
  score_distribution: ScoreDistributionBin[];
  item_analysis: QuestionAnalysis[];
  version_analyses?: VersionQuestionAnalysis[];
  submission_errors: SubmissionError[];
}
