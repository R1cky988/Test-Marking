package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;


/**
 * total_papers = papers that are marked; submitted_count only for ONLINE / SUBMIT exams (every paper handed in, marked or not);
 * violation_count only for the teacher. highest / lowest / average are in points (null with no paper).
 */
public record ExamStatsResponse(
        @JsonProperty("total_students") long totalStudents,
        @JsonProperty("total_papers") int totalPapers,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("submitted_count") Integer submittedCount,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("violation_count") Integer violationCount,
        @JsonProperty("max_score") BigDecimal maxScore,
        @JsonProperty("highest") BigDecimal highest,
        @JsonProperty("lowest") BigDecimal lowest,
        @JsonProperty("average") BigDecimal average,
        @JsonProperty("distribution") List<ScoreBucketResponse> distribution
) {
}
