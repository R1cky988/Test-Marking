package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.application.imp.ClassDetailImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Class detail page: info, members, join requests, exams. The service decides who may do what
 * (teacher of the class vs enrolled student); the role check here only keeps other roles out.
 */
@RestController
@RequestMapping("/api/v1/web/classes")
@PreAuthorize("hasAnyRole('TEACHER','STUDENT')")
@RequiredArgsConstructor

public class ClassController {

    private final ClassDetailImp service;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    @GetMapping("/{classId}")
    public ApiResponse<Map<String, Object>> detail(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId) {
        return ok(service.detail(me.getUser(), classId));
    }

    /** Teacher: new join code, the old one stops working. */
    @PostMapping("/{classId}/join-code")
    public ApiResponse<Map<String, Object>> regenerateJoinCode(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId) {
        return ok(service.regenerateJoinCode(me.getUser(), classId));
    }

    @GetMapping("/{classId}/members")
    public ApiResponse<Map<String, Object>> members(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId) {
        return ok(service.members(me.getUser(), classId));
    }

    @DeleteMapping("/{classId}/members/{studentId}")
    public ApiResponse<Map<String, String>> removeStudent(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                          @PathVariable UUID studentId) {
        service.removeStudent(me.getUser(), classId, studentId);
        return ok(Map.of("message", "Đã xóa học sinh khỏi lớp"));
    }

    @GetMapping("/{classId}/exams")
    public ApiResponse<Map<String, Object>> exams(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId) {
        return ok(service.exams(me.getUser(), classId));
    }

    // ─── join requests ───────────────────────────────────────────

    /** Student: body {"join_code":"ABC123","message":"optional"}. Answer status is PENDING or JOINED. */
    @PostMapping("/join")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> join(@AuthenticationPrincipal SecurityUser me, @RequestBody Map<String, Object> body) {
        return ok(service.joinByCode(me.getUser(), body));
    }

    /** Teacher: ?status=PENDING (default) | APPROVED | REJECTED */
    @GetMapping("/{classId}/join-requests")
    public ApiResponse<List<Map<String, Object>>> joinRequests(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                               @RequestParam(required = false) String status) {
        return ok(service.joinRequests(me.getUser(), classId, status));
    }

    @PostMapping("/{classId}/join-requests/{requestId}/approve")
    public ApiResponse<Map<String, Object>> approve(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                    @PathVariable UUID requestId) {
        return ok(service.approve(me.getUser(), classId, requestId));
    }

    /** Body (optional) {"reason":"..."} */
    @PostMapping("/{classId}/join-requests/{requestId}/reject")
    public ApiResponse<Map<String, Object>> reject(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                   @PathVariable UUID requestId, @RequestBody(required = false) Map<String, Object> body) {
        return ok(service.reject(me.getUser(), classId, requestId, body));
    }
}
