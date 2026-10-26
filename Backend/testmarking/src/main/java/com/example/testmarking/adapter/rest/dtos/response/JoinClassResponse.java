package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** status = JOINED (no approval needed) or PENDING (teacher must approve). */
public record JoinClassResponse(
        @JsonProperty("class_id") UUID classId,
        @JsonProperty("class_name") String className,
        @JsonProperty("status") String status
) {
}
