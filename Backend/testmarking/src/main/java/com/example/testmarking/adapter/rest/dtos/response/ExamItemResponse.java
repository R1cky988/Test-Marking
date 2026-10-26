package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One exam of the class. is_score_published only for the teacher. */
public record ExamItemResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("status") String status,
        @JsonProperty("bucket") String bucket,
        @JsonProperty("format") String format,
        @JsonProperty("from_time") OffsetDateTime fromTime,
        @JsonProperty("to_time") OffsetDateTime toTime,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("is_score_published") Boolean isScorePublished
) {
}
