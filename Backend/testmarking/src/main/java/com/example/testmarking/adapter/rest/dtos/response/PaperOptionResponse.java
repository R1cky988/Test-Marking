package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.*;

/** One choice of a question as the student sees it; the server never says which one is right before the result is released. */
public record PaperOptionResponse(
        @JsonProperty("label") String label,
        @JsonProperty("content") String content
) {
}
