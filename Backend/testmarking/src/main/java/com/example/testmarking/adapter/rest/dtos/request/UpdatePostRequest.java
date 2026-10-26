package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Body of PUT /classes/{id}/posts/{postId}. A field that is null is left unchanged. */
public record UpdatePostRequest(
        @JsonProperty("title") String title,
        @JsonProperty("content") String content,
        @JsonProperty("type") String type,
        @JsonProperty("status") String status,
        @JsonProperty("allow_comments") Boolean allowComments,
        @JsonProperty("is_pinned") Boolean isPinned
) {
}
