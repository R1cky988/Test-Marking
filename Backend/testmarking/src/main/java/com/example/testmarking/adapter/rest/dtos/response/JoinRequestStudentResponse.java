package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Who asked to join (teacher view). */
public record JoinRequestStudentResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("email") String email,
        @JsonProperty("student_code") String studentCode
) {
}
