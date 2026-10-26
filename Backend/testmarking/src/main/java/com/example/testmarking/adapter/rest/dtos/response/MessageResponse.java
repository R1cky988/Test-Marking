package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** A plain confirmation. */
public record MessageResponse(
        @JsonProperty("message") String message
) {
}
