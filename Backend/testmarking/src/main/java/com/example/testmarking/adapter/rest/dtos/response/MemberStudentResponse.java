package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Student of a class in the members tab. email only for the teacher. */
public record MemberStudentResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("student_code") String studentCode,
        @JsonProperty("joined_at") OffsetDateTime joinedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("email") String email
) {
}
