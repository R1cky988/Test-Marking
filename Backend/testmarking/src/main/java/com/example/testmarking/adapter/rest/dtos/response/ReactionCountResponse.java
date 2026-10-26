package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** How many people used one reaction. */
public record ReactionCountResponse(
        @JsonProperty("reaction_type") String reactionType,
        @JsonProperty("count") long count
) {
}
