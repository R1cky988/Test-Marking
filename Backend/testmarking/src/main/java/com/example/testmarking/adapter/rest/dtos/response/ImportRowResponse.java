package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Result of one Excel row. status: CREATED | EXISTS_ADDED (account already there, only added to the class) | EXISTS_IN_CLASS (already a member) | INVALID_EMAIL | DUPLICATE_IN_FILE | EMAIL_FAILED. */
public record ImportRowResponse(
        @JsonProperty("row") int row,
        @JsonProperty("name") String name,
        @JsonProperty("email") String email,
        @JsonProperty("status") String status,
        @JsonProperty("message") String message
) {
}
