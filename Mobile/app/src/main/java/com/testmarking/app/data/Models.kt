package com.testmarking.app.data

import com.google.gson.annotations.SerializedName

// Every response field is nullable with a default: Gson fills what the server sent and leaves the rest.

/** The server wraps every answer as { status, message, data }. status 0 = failed. */
data class ApiEnvelope<T>(
    val status: Int? = null,
    val message: String? = null,
    val data: T? = null,
)

data class ListEnvelope<T>(
    val status: Int? = null,
    val message: String? = null,
    val data: List<T>? = null,
    val meta: PageMeta? = null,
)

data class PageMeta(val page: Int? = null, val limit: Int? = null, val total: Long? = null)

data class TokenPair(
    @SerializedName(value = "AccessToken", alternate = ["accessToken", "access_token"])
    val accessToken: String? = null,
    @SerializedName(value = "RefreshToken", alternate = ["refreshToken", "refresh_token"])
    val refreshToken: String? = null,
)

data class UserDto(
    val uuid: String? = null,
    val email: String? = null,
    val phoneNumber: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val gender: String? = null,
    val role: String? = null,
)

// ---- request bodies ----

data class LoginBody(val email: String, val password: String)

/** dob is yyyy-MM-dd, gender is MALE | FEMALE | OTHER (same as the web app). */
data class RegisterBody(
    val email: String,
    val phoneNumber: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val dob: String,
    val gender: String,
)

data class VerifyBody(val email: String, val code: String)
data class EmailBody(val email: String)
data class RefreshBody(val refreshToken: String)

// ---- classes ----

data class PersonDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
)

data class ClassItemDto(
    val id: String? = null,
    @SerializedName("class_name") val className: String? = null,
    @SerializedName("class_code") val classCode: String? = null,
    val subject: String? = null,
    val description: String? = null,
    /** "active" or "archived" */
    val status: String? = null,
    @SerializedName("student_count") val studentCount: Long? = null,
    val teacher: PersonDto? = null,
    /** TEACHER = I created it, STUDENT = I joined it */
    @SerializedName("my_role") val myRole: String? = null,
    @SerializedName("is_teacher") val isTeacher: Boolean? = null,
    @SerializedName("join_code") val joinCode: String? = null,
)

data class ClassDetailDto(
    val id: String? = null,
    @SerializedName("class_name") val className: String? = null,
    @SerializedName("class_code") val classCode: String? = null,
    val subject: String? = null,
    val description: String? = null,
    val status: String? = null,
    @SerializedName("student_count") val studentCount: Long? = null,
    @SerializedName("my_role") val myRole: String? = null,
    @SerializedName("is_teacher") val isTeacher: Boolean? = null,
    val teacher: PersonDto? = null,
    @SerializedName("join_code") val joinCode: String? = null,
    /** teacher only */
    @SerializedName("pending_request_count") val pendingRequestCount: Long? = null,
)

data class CreateClassBody(
    @SerializedName("class_name") val className: String,
    val subject: String?,
    val description: String?,
    @SerializedName("require_join_approval") val requireJoinApproval: Boolean,
)

data class JoinBody(
    @SerializedName("join_code") val joinCode: String,
    val message: String? = null,
)

data class JoinResultDto(
    @SerializedName("class_id") val classId: String? = null,
    @SerializedName("class_name") val className: String? = null,
    /** JOINED or PENDING (teacher must approve) */
    val status: String? = null,
)

// ---- class detail: members ----

data class MemberTeacherDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    val role: String? = null,
    /** only sent to the teacher himself */
    val email: String? = null,
)

data class MemberStudentDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("student_code") val studentCode: String? = null,
    @SerializedName("joined_at") val joinedAt: String? = null,
    /** only sent to the teacher */
    val email: String? = null,
)

data class MembersDto(
    val teachers: List<MemberTeacherDto>? = null,
    val students: List<MemberStudentDto>? = null,
    @SerializedName("student_count") val studentCount: Int? = null,
)

data class JoinRequestStudentDto(
    val id: String? = null,
    val name: String? = null,
    val email: String? = null,
    @SerializedName("student_code") val studentCode: String? = null,
)

data class JoinRequestDto(
    val id: String? = null,
    val student: JoinRequestStudentDto? = null,
    val message: String? = null,
    val status: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
)

data class JoinDecisionDto(val id: String? = null, val status: String? = null)

/** reason is optional; Gson leaves a null out, so the body is "{}". */
data class RejectBody(val reason: String? = null)

// ---- class detail: posts ----

data class ReactionCountDto(
    @SerializedName("reaction_type") val reactionType: String? = null,
    val count: Long? = null,
)

data class ReactionSummaryDto(
    /** my reaction (LIKE ...) or null */
    @SerializedName("viewer_reaction") val viewerReaction: String? = null,
    @SerializedName("total_count") val totalCount: Long? = null,
    val counts: List<ReactionCountDto>? = null,
)

data class DocumentDto(
    val id: String? = null,
    val title: String? = null,
    @SerializedName("file_name") val fileName: String? = null,
    @SerializedName("file_type") val fileType: String? = null,
    @SerializedName("file_size") val fileSize: Long? = null,
)

data class CommentDto(
    val id: String? = null,
    @SerializedName("parent_id") val parentId: String? = null,
    val author: PersonDto? = null,
    val content: String? = null,
    @SerializedName("is_hidden") val isHidden: Boolean? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("can_edit") val canEdit: Boolean? = null,
    @SerializedName("can_delete") val canDelete: Boolean? = null,
)

data class PostDto(
    val id: String? = null,
    /** POST | ANNOUNCEMENT */
    val type: String? = null,
    /** DRAFT | PUBLISHED | CLOSED */
    val status: String? = null,
    val title: String? = null,
    val content: String? = null,
    @SerializedName("allow_comments") val allowComments: Boolean? = null,
    @SerializedName("is_pinned") val isPinned: Boolean? = null,
    val author: PersonDto? = null,
    @SerializedName("published_at") val publishedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("can_edit") val canEdit: Boolean? = null,
    @SerializedName("can_delete") val canDelete: Boolean? = null,
    @SerializedName("can_moderate") val canModerate: Boolean? = null,
    val attachments: List<DocumentDto>? = null,
    val comments: List<CommentDto>? = null,
    @SerializedName("comment_count") val commentCount: Long? = null,
    val reactions: ReactionSummaryDto? = null,
)

/** Students may only send type POST and status PUBLISHED. */
data class CreatePostBody(
    val title: String?,
    val content: String,
    val type: String,
    val status: String = "PUBLISHED",
    @SerializedName("allow_comments") val allowComments: Boolean = true,
)

data class CommentBody(
    val content: String,
    @SerializedName("parent_comment_id") val parentCommentId: String? = null,
)

/** LIKE, or null to take my reaction back. */
data class ReactionBody(@SerializedName("reaction_type") val reactionType: String?)

// ---- class detail: exams ----

data class ExamItemDto(
    val id: String? = null,
    val name: String? = null,
    val subject: String? = null,
    /** DRAFT | UPCOMING | ONGOING | COMPLETED | CANCELLED */
    val status: String? = null,
    /** draft | upcoming | ongoing | ended */
    val bucket: String? = null,
    /** OFFLINE | ONLINE | SUBMIT */
    val format: String? = null,
    @SerializedName("from_time") val fromTime: String? = null,
    @SerializedName("to_time") val toTime: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    @SerializedName("is_score_published") val isScorePublished: Boolean? = null,
)

data class ClassExamsDto(
    val upcoming: List<ExamItemDto>? = null,
    val ongoing: List<ExamItemDto>? = null,
    val ended: List<ExamItemDto>? = null,
    /** teacher only */
    val draft: List<ExamItemDto>? = null,
)
