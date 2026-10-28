package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DifficultyCountsResponse(
        @JsonProperty("easy") int easy,
        @JsonProperty("medium") int medium,
        @JsonProperty("hard") int hard
) {
}
