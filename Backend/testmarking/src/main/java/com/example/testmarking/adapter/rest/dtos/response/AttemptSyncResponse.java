package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The answer to a sync: the attempt as the server now has it, and, once the final answers were marked, the student's own
 * result (detail only when the result is released). result is absent while he is still working or the exam is locked.
 */
public record AttemptSyncResponse(
        @JsonProperty("attempt") AttemptStateResponse attempt,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("result") MyResultResponse result
) {
}
