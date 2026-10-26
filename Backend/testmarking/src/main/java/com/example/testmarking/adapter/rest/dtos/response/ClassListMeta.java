package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Paging info of the class list. */
public record ClassListMeta(
        @JsonProperty("page") int page,
        @JsonProperty("limit") int limit,
        @JsonProperty("total") long total
) {
}
