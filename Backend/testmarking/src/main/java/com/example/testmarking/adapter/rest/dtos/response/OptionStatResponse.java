package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;


public record OptionStatResponse(
        @JsonProperty("label") String label,
        @JsonProperty("content") String content,
        @JsonProperty("is_correct") boolean correct,
        @JsonProperty("count") int count,
        @JsonProperty("percent") double percent
) {
}
