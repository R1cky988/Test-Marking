package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** { status, message, data: [exam...], meta: {page, limit, total} } */
public record ExamListResponse(
        @JsonProperty("status") int status,
        @JsonProperty("message") String message,
        @JsonProperty("data") List<ExamResponse> data,
        @JsonProperty("meta") ClassListMeta meta
) {
}
