package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;

/** Everything the A4 print page needs: the exam name and every version with its questions. */
public record ExamPrintResponse(
        @JsonProperty("exam_id") UUID examId,
        @JsonProperty("exam_name") String examName,
        @JsonProperty("versions") List<ExamVersionDetailResponse> versions
) {
}
