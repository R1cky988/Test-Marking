package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Reactions of a post or comment, as seen by the caller. */
public record ReactionSummaryResponse(
        @JsonProperty("viewer_reaction") String viewerReaction,
        @JsonProperty("total_count") long totalCount,
        @JsonProperty("counts") List<ReactionCountResponse> counts
) {
}
