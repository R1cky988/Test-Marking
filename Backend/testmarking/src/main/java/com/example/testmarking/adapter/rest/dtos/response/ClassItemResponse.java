package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** One class in the list. my_role is the role of the caller IN THIS CLASS (TEACHER = created it, STUDENT = joined it). join_code only for the teacher. */
public record ClassItemResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("class_name") String className,
        @JsonProperty("class_code") String classCode,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description,
        @JsonProperty("status") String status,
        @JsonProperty("approval_mode") String approvalMode,
        @JsonProperty("require_join_approval") boolean requireJoinApproval,
        @JsonProperty("student_count") long studentCount,
        @JsonProperty("teacher_id") UUID teacherId,
        @JsonProperty("teacher") PersonResponse teacher,
        @JsonProperty("my_role") String myRole,
        @JsonProperty("is_teacher") boolean isTeacher,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("join_code") String joinCode,
        @JsonProperty("created_at") String createdAt,
        @JsonProperty("updated_at") String updatedAt
) {
}
