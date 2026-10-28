package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** { status, message, data: [question...], meta: {page, limit, total} } */
public record QuestionListResponse(
        @JsonProperty("status") int status,
        @JsonProperty("message") String message,
        @JsonProperty("data") List<QuestionResponse> data,
        @JsonProperty("meta") ClassListMeta meta
) {
}
