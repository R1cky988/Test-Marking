package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Body of PUT /classes/{id}. A field that is missing (null) is left unchanged; an empty string clears subject / description / class_code. */
public record UpdateClassRequest(
        @JsonProperty("class_name") String className,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description,
        @JsonProperty("class_code") String classCode,
        @JsonProperty("approval_mode") String approvalMode,
        @JsonProperty("require_join_approval") Boolean requireJoinApproval
) {
}
