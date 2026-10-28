package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Summary of an Excel import. Passwords are only e-mailed to the new accounts, never returned here. */
public record ImportStudentsResponse(
        @JsonProperty("total_rows") int totalRows,
        @JsonProperty("created") int created,
        @JsonProperty("skipped_existing") int skippedExisting,
        @JsonProperty("invalid") int invalid,
        @JsonProperty("failed") int failed,
        @JsonProperty("rows") List<ImportRowResponse> rows
) {
}
