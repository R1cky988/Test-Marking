package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;


public record OverviewExamResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("class_id") UUID classId,
        @JsonProperty("class_name") String className,
        @JsonProperty("format") String format,
        @JsonProperty("status") String status,
        @JsonProperty("from_time") OffsetDateTime fromTime,
        @JsonProperty("to_time") OffsetDateTime toTime,
        @JsonProperty("my_role") String myRole
) {
}
