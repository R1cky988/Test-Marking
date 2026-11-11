package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.request.AttemptSyncRequest;
import com.example.testmarking.adapter.rest.dtos.response.AttemptStateResponse;
import com.example.testmarking.adapter.rest.dtos.response.AttemptSyncResponse;
import com.example.testmarking.adapter.rest.dtos.response.ExamParticipantResponse;
import com.example.testmarking.adapter.rest.dtos.response.OnlinePaperResponse;
import com.example.testmarking.application.imp.OnlineExamImp;
import com.example.testmarking.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Online exam on the phone: start, state, sync (student) and unlock (teacher). */
@RestController
@RequestMapping("/api/v1/exams")
@PreAuthorize("isAuthenticated()")
public class OnlineExamController {

    private final OnlineExamImp service;

    public OnlineExamController(OnlineExamImp service) {
        this.service = service;
    }

    @PostMapping("/{examId}/attempt/start")
    public ApiResponse<OnlinePaperResponse> start(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID examId) {
        return ok(service.start(me.getUser(), examId));
    }

    @GetMapping("/{examId}/attempt")
    public ApiResponse<AttemptStateResponse> state(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID examId) {
        return ok(service.state(me.getUser(), examId));
    }

    @PostMapping("/{examId}/attempt/sync")
    public ApiResponse<AttemptSyncResponse> sync(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID examId,
                                                 @RequestBody AttemptSyncRequest body) {
        return ok(service.sync(me.getUser(), examId, body));
    }

    @PostMapping("/{examId}/attempts/{studentId}/unlock")
    public ApiResponse<ExamParticipantResponse> unlock(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID examId,
                                                       @PathVariable UUID studentId) {
        return ok(service.unlock(me.getUser(), examId, studentId));
    }

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }
}
