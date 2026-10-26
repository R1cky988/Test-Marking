package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Public view of a user: never the email, phone or numeric id. */
public record PersonResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("avatar_url") String avatarUrl
) {
}
