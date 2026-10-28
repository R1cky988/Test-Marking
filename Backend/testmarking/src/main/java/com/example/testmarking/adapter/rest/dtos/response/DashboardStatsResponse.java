package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Counters on the dashboard (demo values for what is not ported yet). */
public record DashboardStatsResponse(
        @JsonProperty("class_count") long classCount,
        @JsonProperty("active_exam_count") int activeExamCount,
        @JsonProperty("upcoming_exam_count") int upcomingExamCount,
        @JsonProperty("pending_close_exams") int pendingCloseExams
) {
}
