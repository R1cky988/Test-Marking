package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.UUID;

public record QuestionBankResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("description") String description,
        @JsonProperty("items_count") int itemsCount,
        @JsonProperty("difficulty_counts") DifficultyCountsResponse difficultyCounts,
        @JsonProperty("created_at") LocalDate createdAt,
        @JsonProperty("updated_at") LocalDate updatedAt
) {
}
