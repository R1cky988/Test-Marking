package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * One question. content / explanation / options are LaTeX-friendly text ($x^2$, $$\frac{a}{b}$$).
 * options are in order A, B, C...; correct_answers are labels ("A", "C").
 * question_type: SINGLE (exactly one correct answer) | MULTIPLE (one or more). difficulty: EASY | MEDIUM | HARD (any case).
 */
public record QuestionRequest(
        @JsonProperty("content") String content,
        @JsonProperty("explanation") String explanation,
        @JsonProperty("options") List<String> options,
        @JsonProperty("question_type") String questionType,
        @JsonProperty("correct_answers") List<String> correctAnswers,
        @JsonProperty("difficulty") String difficulty
) {
}
