package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;


/** Dashboard: what is coming, what is running and what is over (5 each, soonest / newest first) with the totals, and the classes involved. */
public record ExamOverviewResponse(
        @JsonProperty("upcoming_count") int upcomingCount,
        @JsonProperty("ongoing_count") int ongoingCount,
        @JsonProperty("completed_count") int completedCount,
        @JsonProperty("draft_count") long draftCount,
        @JsonProperty("class_count") long classCount,
        @JsonProperty("upcoming") List<OverviewExamResponse> upcoming,
        @JsonProperty("ongoing") List<OverviewExamResponse> ongoing,
        @JsonProperty("completed") List<OverviewExamResponse> completed,
        @JsonProperty("classes") List<OverviewClassResponse> classes
) {
}
