package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;


/** Score range [from, to) on a 0-10 scale (the last one includes 10). */
public record ScoreBucketResponse(
        @JsonProperty("label") String label,
        @JsonProperty("from") int from,
        @JsonProperty("to") int to,
        @JsonProperty("count") int count
) {
}
