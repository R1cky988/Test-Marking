package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Who reacted and with what. */
public record ReactorResponse(
        @JsonProperty("user_id") UUID userId,
        @JsonProperty("name") String name,
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("reaction_type") String reactionType,
        @JsonProperty("reacted_at") OffsetDateTime reactedAt
) {
}
