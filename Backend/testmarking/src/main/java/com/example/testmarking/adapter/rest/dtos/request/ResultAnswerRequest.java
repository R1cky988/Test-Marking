package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;


public record ResultAnswerRequest(
        @JsonProperty("order") Integer order,
        @JsonProperty("choice") String choice
) {
}
