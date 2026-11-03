package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.request.ExamRequest;
import com.example.testmarking.adapter.rest.dtos.request.GenerateVersionsRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.ExamImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Exams of the logged-in teacher: CRUD, publish, random versions ("mã đề") and the A4 print data. The service checks ownership. */
@RestController
@RequestMapping("/api/v1/exams")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ExamController {

    private final ExamImp service;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    /** ?page=1&limit=10&search=&format=OFFLINE|ONLINE|SUBMIT&class_id=&role=student -> { status, message, data, meta }. role=student lists the exams of the classes I study in. */
    @GetMapping
    public ExamListResponse list(@AuthenticationPrincipal SecurityUser me,
                                 @RequestParam(name = "page", required = false) Integer page,
                                 @RequestParam(name = "limit", required = false) Integer limit,
                                 @RequestParam(name = "search", required = false) String search,
                                 @RequestParam(name = "format", required = false) String format,
                                 @RequestParam(name = "class_id", required = false) UUID classId,
                                 @RequestParam(name = "role", required = false) String role) {
        return service.list(me.getUser(), page, limit, search, format, classId, role);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExamResponse> create(@AuthenticationPrincipal SecurityUser me, @RequestBody ExamRequest body) {
        return ok(service.create(me.getUser(), body));
    }

    @GetMapping("/{examId}")
    public ApiResponse<ExamResponse> get(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.get(me.getUser(), examId));
    }

    @PutMapping("/{examId}")
    public ApiResponse<ExamResponse> update(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId, @RequestBody ExamRequest body) {
        return ok(service.update(me.getUser(), examId, body));
    }

    @DeleteMapping("/{examId}")
    public ApiResponse<MessageResponse> delete(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.delete(me.getUser(), examId));
    }

    @PostMapping("/{examId}/publish")
    public ApiResponse<ExamResponse> publish(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.publish(me.getUser(), examId));
    }

    // ─── versions ────────────────────────────────────────────────

    /** Body { count, easy, medium, hard }: replaces all versions with `count` random ones. */
    @PostMapping("/{examId}/versions/generate")
    public ApiResponse<List<ExamVersionSummaryResponse>> generate(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                                  @RequestBody GenerateVersionsRequest body) {
        return ok(service.generateVersions(me.getUser(), examId, body));
    }

    @GetMapping("/{examId}/versions")
    public ApiResponse<List<ExamVersionSummaryResponse>> versions(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.versions(me.getUser(), examId));
    }

    @GetMapping("/{examId}/versions/{codeId}")
    public ApiResponse<ExamVersionDetailResponse> version(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                          @PathVariable("codeId") UUID codeId) {
        return ok(service.version(me.getUser(), examId, codeId));
    }

    /** All versions with their questions, for the printable A4 page. */
    @GetMapping("/{examId}/print")
    public ApiResponse<ExamPrintResponse> print(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.print(me.getUser(), examId));
    }
}
