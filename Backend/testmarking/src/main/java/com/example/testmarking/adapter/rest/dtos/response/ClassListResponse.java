package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** { status, message, data: [class...], meta } - the shape the list page reads. */
public record ClassListResponse(
        @JsonProperty("status") int status,
        @JsonProperty("message") String message,
        @JsonProperty("data") List<ClassItemResponse> data,
        @JsonProperty("meta") ClassListMeta meta
) {
}
