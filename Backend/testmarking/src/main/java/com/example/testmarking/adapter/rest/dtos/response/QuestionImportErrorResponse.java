package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** A row of the Excel file that was not imported: its row number in Excel and why. */
public record QuestionImportErrorResponse(
        @JsonProperty("row") int row,
        @JsonProperty("reason") String reason
) {
}
