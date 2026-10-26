package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Body of POST /classes/{id}/posts. type POST | ANNOUNCEMENT, status DRAFT | PUBLISHED | CLOSED. Students may only send type POST, status PUBLISHED and no pin. */
public record CreatePostRequest(
        @JsonProperty("title") String title,
        @JsonProperty("content") String content,
        @JsonProperty("type") String type,
        @JsonProperty("status") String status,
        @JsonProperty("allow_comments") Boolean allowComments,
        @JsonProperty("is_pinned") Boolean isPinned
) {
}
