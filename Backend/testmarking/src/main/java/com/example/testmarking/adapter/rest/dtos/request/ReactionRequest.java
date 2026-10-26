package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** LIKE | LOVE | HAHA | WOW | SAD | ANGRY, or null to remove the reaction. */
public record ReactionRequest(
        @JsonProperty("reaction_type") String reactionType
) {
}
