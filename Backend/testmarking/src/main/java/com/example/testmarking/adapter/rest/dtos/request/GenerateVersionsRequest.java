package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Make `count` different versions; each one gets `easy` + `medium` + `hard` questions drawn at random from the exam's bank. */
public record GenerateVersionsRequest(
        @JsonProperty("count") Integer count,
        @JsonProperty("easy") Integer easy,
        @JsonProperty("medium") Integer medium,
        @JsonProperty("hard") Integer hard
) {
}
