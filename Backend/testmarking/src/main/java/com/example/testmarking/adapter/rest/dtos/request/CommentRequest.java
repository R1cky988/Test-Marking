package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CommentRequest(
        @JsonProperty("content") String content,
        @JsonProperty("parent_comment_id") String parentCommentId
) {
}
