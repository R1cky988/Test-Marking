package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Class info for the detail page. join_code, require_join_approval and pending_request_count are only sent to the teacher of the class. */
public record ClassDetailResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("class_name") String className,
        @JsonProperty("class_code") String classCode,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description,
        @JsonProperty("approval_mode") String approvalMode,
        @JsonProperty("status") String status,
        @JsonProperty("student_count") long studentCount,
        @JsonProperty("my_role") String myRole,
        @JsonProperty("is_teacher") boolean isTeacher,
        @JsonProperty("teacher") PersonResponse teacher,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("join_code") String joinCode,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("require_join_approval") Boolean requireJoinApproval,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("pending_request_count") Long pendingRequestCount
) {
}
