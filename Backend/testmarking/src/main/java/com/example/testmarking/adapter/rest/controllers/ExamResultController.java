package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.rest.dtos.request.ResultRequest;
import com.example.testmarking.adapter.rest.dtos.request.ViolationRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.ExamOverviewImp;
import com.example.testmarking.application.imp.ExamResultImp;
import com.example.testmarking.application.imp.ExamResultImp.FileData;
import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Papers, statistics, violations and the dashboard of the exams. The service decides who may see what:
 * the teacher of the exam sees everything; a student of the class only the statistics and his own paper, once released.
 */
@RestController
@RequestMapping("/api/v1/exams")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ExamResultController {

    private final ExamResultImp service;
    private final ExamOverviewImp overview;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    /** Dashboard: coming / running / finished exams, classes involved. */
    @GetMapping("/overview")
    public ApiResponse<ExamOverviewResponse> overview(@AuthenticationPrincipal SecurityUser me) {
        return ok(overview.overview(me.getUser()));
    }

    /** Total papers, score spread 0-2 … 8-10, highest, lowest, average (+ handed-in count for ONLINE / SUBMIT). */
    @GetMapping("/{examId}/stats")
    public ApiResponse<ExamStatsResponse> stats(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.stats(me.getUser(), examId));
    }

    /** Everybody of the class; ?submitted=true keeps who handed a paper in. */
    @GetMapping("/{examId}/participants")
    public ApiResponse<List<ExamParticipantResponse>> participants(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                                   @RequestParam(name = "submitted", required = false) Boolean submitted) {
        return ok(service.participants(me.getUser(), examId, Boolean.TRUE.equals(submitted)));
    }

    @GetMapping("/{examId}/results")
    public ApiResponse<List<ExamResultRowResponse>> results(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.results(me.getUser(), examId));
    }

    @GetMapping("/{examId}/results/{resultId}")
    public ApiResponse<ExamResultDetailResponse> result(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                        @PathVariable("resultId") UUID resultId) {
        return ok(service.result(me.getUser(), examId, resultId));
    }

    /** The teacher enters / corrects one paper: { student_id | student_code, test_code, answers: [{order, choice}] }. */
    @PostMapping("/{examId}/results")
    public ApiResponse<ExamResultDetailResponse> record(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                        @RequestBody ResultRequest body) {
        return ok(service.record(me.getUser(), examId, body));
    }

    @PostMapping("/{examId}/results/publish")
    public ApiResponse<ExamResponse> publish(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.publishResults(me.getUser(), examId, true));
    }

    @PostMapping("/{examId}/results/unpublish")
    public ApiResponse<ExamResponse> unpublish(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.publishResults(me.getUser(), examId, false));
    }

    /** The photo of a paper (?kind=marked|dewarped|raw; default the best one). Teacher, or the student of his own paper once released. */
    @GetMapping("/{examId}/results/{resultId}/image")
    public ResponseEntity<InputStreamResource> image(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                     @PathVariable("resultId") UUID resultId,
                                                     @RequestParam(name = "kind", required = false) String kind) {
        ExamResultImp.Image img = service.image(me.getUser(), examId, resultId, kind);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.contentType()))
                .header("Cache-Control", "private, max-age=300")
                .body(new InputStreamResource(img.stream()));
    }

    /** multipart/form-data: file (JPG/PNG/WEBP, max 10MB), kind (marked by default). */
    @PostMapping(path = "/{examId}/results/{resultId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExamResultRowResponse> uploadImage(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                          @PathVariable("resultId") UUID resultId,
                                                          @RequestParam("file") MultipartFile file,
                                                          @RequestParam(name = "kind", required = false) String kind) throws IOException {
        FileData data = new FileData(file.getOriginalFilename(), file.getContentType(), file.getSize(), file.getInputStream());
        return ok(service.uploadImage(me.getUser(), examId, resultId, kind, data));
    }

    // ─── the student's own paper ─────────────────────────────────

    @GetMapping("/{examId}/my-result")
    public ApiResponse<MyResultResponse> myResult(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.myResult(me.getUser(), examId));
    }

    /** A student hands in his ONLINE paper: { test_code, answers: [{order, choice}] }. */
    @PostMapping("/{examId}/my-result")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MyResultResponse> submit(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                @RequestBody ResultRequest body) {
        return ok(service.submit(me.getUser(), examId, body));
    }

    // ─── violations and analysis (teacher) ───────────────────────

    @GetMapping("/{examId}/violations")
    public ApiResponse<List<ExamResultRowResponse>> violations(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.violations(me.getUser(), examId));
    }

    /** { student_id, violation: true|false, reason }: 0 points while it stands, the real marks come back when cleared. */
    @PutMapping("/{examId}/violations")
    public ApiResponse<ExamParticipantResponse> setViolation(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId,
                                                             @RequestBody ViolationRequest body) {
        return ok(service.setViolation(me.getUser(), examId, body));
    }

    @GetMapping("/{examId}/analysis")
    public ApiResponse<ExamAnalysisResponse> analysis(@AuthenticationPrincipal SecurityUser me, @PathVariable("examId") UUID examId) {
        return ok(service.analysis(me.getUser(), examId));
    }
}
