package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.request.QuestionBankRequest;
import com.example.testmarking.adapter.rest.dtos.request.QuestionRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.QuestionBankImp;
import com.example.testmarking.application.imp.QuestionImp;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Question banks and their questions. Everything here is about MY banks: the services check that the bank belongs to the
 * caller (403 otherwise). Any logged-in user may have banks, like classes.
 */
@RestController
@RequestMapping("/api/v1/question-banks")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class QuestionBankController {

    private final QuestionBankImp banks;
    private final QuestionImp questions;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    // ─── banks ───────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<List<QuestionBankResponse>> list(@AuthenticationPrincipal SecurityUser me,
                                                        @RequestParam(name = "search", required = false) String search) {
        return ok(banks.list(me.getUser(), search));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<QuestionBankResponse> create(@AuthenticationPrincipal SecurityUser me, @RequestBody QuestionBankRequest body) {
        return ok(banks.create(me.getUser(), body));
    }

    @GetMapping("/{bankId}")
    public ApiResponse<QuestionBankResponse> get(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId) {
        return ok(banks.get(me.getUser(), bankId));
    }

    @PutMapping("/{bankId}")
    public ApiResponse<QuestionBankResponse> update(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                                    @RequestBody QuestionBankRequest body) {
        return ok(banks.update(me.getUser(), bankId, body));
    }

    @DeleteMapping("/{bankId}")
    public ApiResponse<MessageResponse> delete(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId) {
        return ok(banks.delete(me.getUser(), bankId));
    }

    // ─── questions ───────────────────────────────────────────────

    /** ?page=1&limit=10&search=&difficulty=easy|medium|hard&type=single|multiple -> { status, message, data, meta } */
    @GetMapping("/{bankId}/questions")
    public QuestionListResponse listQuestions(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                              @RequestParam(name = "page", required = false) Integer page,
                                              @RequestParam(name = "limit", required = false) Integer limit,
                                              @RequestParam(name = "search", required = false) String search,
                                              @RequestParam(name = "difficulty", required = false) String difficulty,
                                              @RequestParam(name = "type", required = false) String type) {
        return questions.list(me.getUser(), bankId, page, limit, search, difficulty, type);
    }

    @PostMapping("/{bankId}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<QuestionResponse> createQuestion(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                                        @RequestBody QuestionRequest body) {
        return ok(questions.create(me.getUser(), bankId, body));
    }

    @PutMapping("/{bankId}/questions/{questionId}")
    public ApiResponse<QuestionResponse> updateQuestion(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                                        @PathVariable("questionId") UUID questionId, @RequestBody QuestionRequest body) {
        return ok(questions.update(me.getUser(), bankId, questionId, body));
    }

    @DeleteMapping("/{bankId}/questions/{questionId}")
    public ApiResponse<MessageResponse> deleteQuestion(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                                       @PathVariable("questionId") UUID questionId) {
        return ok(questions.delete(me.getUser(), bankId, questionId));
    }

    /** multipart/form-data: file (.xlsx). Bad rows are listed in the answer; the good ones are saved. */
    @PostMapping(value = "/{bankId}/questions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<QuestionImportResponse> importQuestions(@AuthenticationPrincipal SecurityUser me, @PathVariable("bankId") UUID bankId,
                                                               @RequestParam("file") MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx")) throw TemplateException.badRequestWithCode("NOT_XLSX", "Chỉ nhận tệp Excel .xlsx");
        return ok(questions.importXlsx(me.getUser(), bankId, file.getBytes()));
    }
}
