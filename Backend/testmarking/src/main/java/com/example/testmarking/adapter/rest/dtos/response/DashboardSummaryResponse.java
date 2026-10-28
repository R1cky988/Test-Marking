package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Dashboard summary (demo stub). */
public record DashboardSummaryResponse(
        @JsonProperty("stats") DashboardStatsResponse stats,
        @JsonProperty("recent_exams") List<Object> recentExams,
        @JsonProperty("degraded") boolean degraded,
        @JsonProperty("warnings") List<String> warnings
) {
}
