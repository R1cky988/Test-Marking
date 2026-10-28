package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Create / rename a question bank. Only the name is required. */
public record QuestionBankRequest(
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description
) {
}
