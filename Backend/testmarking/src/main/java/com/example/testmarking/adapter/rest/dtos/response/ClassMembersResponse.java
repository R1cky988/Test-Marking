package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Members tab. */
public record ClassMembersResponse(
        @JsonProperty("teachers") List<MemberTeacherResponse> teachers,
        @JsonProperty("students") List<MemberStudentResponse> students,
        @JsonProperty("student_count") int studentCount
) {
}
