package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Teacher of a class in the members tab. email only for the teacher himself. */
public record MemberTeacherResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("role") String role,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("email") String email
) {
}
