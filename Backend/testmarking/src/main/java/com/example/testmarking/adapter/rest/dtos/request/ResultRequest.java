package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;


/**
 * A paper to score. The teacher gives student_id (the student's public id) or student_code (HSxxxxxxxx); a student
 * submitting an ONLINE exam is always himself. test_code is the 3-digit version; answers are the chosen labels per question
 * number ("B", "A,C" for several, "" or missing = blank).
 */
public record ResultRequest(
        @JsonProperty("student_id") UUID studentId,
        @JsonProperty("student_code") String studentCode,
        @JsonProperty("test_code") String testCode,
        @JsonProperty("answers") List<ResultAnswerRequest> answers
) {
}
