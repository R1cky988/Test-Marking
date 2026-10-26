package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A comment or reply (replies point to parent_id). */
public record CommentResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("parent_id") UUID parentId,
        @JsonProperty("author") PersonResponse author,
        @JsonProperty("content") String content,
        @JsonProperty("is_hidden") boolean isHidden,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("updated_at") OffsetDateTime updatedAt,
        @JsonProperty("can_edit") boolean canEdit,
        @JsonProperty("can_delete") boolean canDelete,
        @JsonProperty("can_hide") boolean canHide,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("reactions") ReactionSummaryResponse reactions
) {
}
