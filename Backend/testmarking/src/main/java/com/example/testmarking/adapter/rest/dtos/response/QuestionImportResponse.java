package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record QuestionImportResponse(
        @JsonProperty("imported") int imported,
        @JsonProperty("skipped") int skipped,
        @JsonProperty("errors") List<QuestionImportErrorResponse> errors
) {
}
