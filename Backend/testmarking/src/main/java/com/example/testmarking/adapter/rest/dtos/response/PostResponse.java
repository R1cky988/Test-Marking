package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** A post of the stream. can_edit = author, can_delete = author or teacher, can_moderate (pin / close) = teacher. */
public record PostResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("type") String type,
        @JsonProperty("status") String status,
        @JsonProperty("title") String title,
        @JsonProperty("content") String content,
        @JsonProperty("allow_comments") boolean allowComments,
        @JsonProperty("is_pinned") boolean isPinned,
        @JsonProperty("author") PersonResponse author,
        @JsonProperty("published_at") OffsetDateTime publishedAt,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("updated_at") OffsetDateTime updatedAt,
        @JsonProperty("can_edit") boolean canEdit,
        @JsonProperty("can_delete") boolean canDelete,
        @JsonProperty("can_moderate") boolean canModerate,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("attachments") List<DocumentResponse> attachments,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("comments") List<CommentResponse> comments,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("comment_count") Long commentCount,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("reactions") ReactionSummaryResponse reactions
) {
}
