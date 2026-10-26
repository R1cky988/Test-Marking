package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Body of POST /classes. approval_mode: manual_approve | auto_approve | no_approval; require_join_approval wins when both are sent. */
public record CreateClassRequest(
        @JsonProperty("class_name") String className,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description,
        @JsonProperty("class_code") String classCode,
        @JsonProperty("approval_mode") String approvalMode,
        @JsonProperty("require_join_approval") Boolean requireJoinApproval
) {
}
