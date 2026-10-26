package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Optional body of POST /classes/{id}/join-requests/{requestId}/reject. */
public record RejectJoinRequest(
        @JsonProperty("reason") String reason
) {
}
