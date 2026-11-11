package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;

/** Everything the A4 print page needs: the exam name, the answer sheet (name + "mã phiếu"; null for an exam without one) and every version with its questions. */
public record ExamPrintResponse(
        @JsonProperty("exam_id") UUID examId,
        @JsonProperty("exam_name") String examName,
        @JsonProperty("template_name") String templateName,
        @JsonProperty("sheet_code") String sheetCode,
        @JsonProperty("versions") List<ExamVersionDetailResponse> versions
) {
}
