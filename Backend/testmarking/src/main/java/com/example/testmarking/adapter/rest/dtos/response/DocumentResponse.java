package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A file of the class. can_delete = teacher of the class or the uploader. */
public record DocumentResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("title") String title,
        @JsonProperty("description") String description,
        @JsonProperty("file_name") String fileName,
        @JsonProperty("file_type") String fileType,
        @JsonProperty("file_size") Long fileSize,
        @JsonProperty("post_id") UUID postId,
        @JsonProperty("uploaded_by") PersonResponse uploadedBy,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("can_delete") boolean canDelete
) {
}
