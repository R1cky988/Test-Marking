package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.request.CreateClassRequest;
import com.example.testmarking.adapter.rest.dtos.request.JoinClassRequest;
import com.example.testmarking.adapter.rest.dtos.request.RejectJoinRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateClassRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
import com.example.testmarking.application.imp.ClassDetailImp;
import com.example.testmarking.application.imp.ClassListImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Classes. Every logged-in user may list, create and join classes; what he may do INSIDE a class (teacher of the class
 * vs student of the class) is decided by the services from the class itself, not from a global role.
 */
@RestController
@RequestMapping("/api/v1/classes")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ClassController {

    private final ClassDetailImp service;
    private final ClassListImp listService;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    // ─── class list ──────────────────────────────────────────────

    /** My classes: created (my_role TEACHER) + joined (my_role STUDENT). Answer: { status, message, data: [...], meta: {page, limit, total} }. */
    @GetMapping
    public ClassListResponse list(@AuthenticationPrincipal SecurityUser me,
                                  @RequestParam(name = "status", required = false) String status,
                                  @RequestParam(name = "search", required = false) String search,
                                  @RequestParam(name = "page", required = false) Integer page,
                                  @RequestParam(name = "limit", required = false) Integer limit) {
        return listService.list(me.getUser(), status, search, page, limit);
    }

    /** Anyone can create a class and becomes its teacher. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ClassItemResponse> create(@AuthenticationPrincipal SecurityUser me, @RequestBody CreateClassRequest body) {
        return ok(listService.create(me.getUser(), body));
    }

    /** Teacher of the class only (checked in the service). */
    @PutMapping("/{classId}")
    public ApiResponse<ClassItemResponse> update(@AuthenticationPrincipal SecurityUser me,
                                                 @PathVariable("classId") UUID classId,
                                                 @RequestBody UpdateClassRequest body) {
        return ok(listService.update(me.getUser(), classId, body));
    }

    /** "Delete" = archive. Nothing is destroyed, the teacher of the class can restore it. */
    @DeleteMapping("/{classId}")
    public ApiResponse<ClassItemResponse> archive(@AuthenticationPrincipal SecurityUser me,
                                                  @PathVariable("classId") UUID classId) {
        return ok(listService.archive(me.getUser(), classId));
    }

    @PostMapping("/{classId}/restore")
    public ApiResponse<ClassItemResponse> restore(@AuthenticationPrincipal SecurityUser me,
                                                  @PathVariable("classId") UUID classId) {
        return ok(listService.restore(me.getUser(), classId));
    }

    @GetMapping("/{classId}")
    public ApiResponse<ClassDetailResponse> detail(@AuthenticationPrincipal SecurityUser me,
                                                   @PathVariable("classId") UUID classId) {
        return ok(service.detail(me.getUser(), classId));
    }

    /** Teacher of the class: new join code, the old one stops working. */
    @PostMapping("/{classId}/join-code")
    public ApiResponse<ClassDetailResponse> regenerateJoinCode(@AuthenticationPrincipal SecurityUser me,
                                                               @PathVariable("classId") UUID classId) {
        return ok(service.regenerateJoinCode(me.getUser(), classId));
    }

    @GetMapping("/{classId}/members")
    public ApiResponse<ClassMembersResponse> members(@AuthenticationPrincipal SecurityUser me,
                                                     @PathVariable("classId") UUID classId) {
        return ok(service.members(me.getUser(), classId));
    }

    @DeleteMapping("/{classId}/members/{studentId}")
    public ApiResponse<MessageResponse> removeStudent(@AuthenticationPrincipal SecurityUser me,
                                                      @PathVariable("classId") UUID classId,
                                                      @PathVariable("studentId") UUID studentId) {
        service.removeStudent(me.getUser(), classId, studentId);
        return ok(new MessageResponse("Đã xóa học sinh khỏi lớp"));
    }

    @GetMapping("/{classId}/exams")
    public ApiResponse<ClassExamsResponse> exams(@AuthenticationPrincipal SecurityUser me,
                                                 @PathVariable("classId") UUID classId) {
        return ok(service.exams(me.getUser(), classId));
    }

    // ─── join requests ───────────────────────────────────────────

    /** Anyone: body {"join_code":"ABC123","message":"optional"}. Answer status is PENDING or JOINED; he becomes a student of that class. */
    @PostMapping("/join")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<JoinClassResponse> join(@AuthenticationPrincipal SecurityUser me, @RequestBody JoinClassRequest body) {
        return ok(service.joinByCode(me.getUser(), body));
    }

    /** Teacher of the class: ?status=PENDING (default) | APPROVED | REJECTED */
    @GetMapping("/{classId}/join-requests")
    public ApiResponse<List<JoinRequestResponse>> joinRequests(@AuthenticationPrincipal SecurityUser me,
                                                               @PathVariable("classId") UUID classId,
                                                               @RequestParam(name = "status", required = false) String status) {
        return ok(service.joinRequests(me.getUser(), classId, status));
    }

    @PostMapping("/{classId}/join-requests/{requestId}/approve")
    public ApiResponse<JoinDecisionResponse> approve(@AuthenticationPrincipal SecurityUser me,
                                                     @PathVariable("classId") UUID classId,
                                                     @PathVariable("requestId") UUID requestId) {
        return ok(service.approve(me.getUser(), classId, requestId));
    }

    /** Body (optional) {"reason":"..."} */
    @PostMapping("/{classId}/join-requests/{requestId}/reject")
    public ApiResponse<JoinDecisionResponse> reject(@AuthenticationPrincipal SecurityUser me,
                                                    @PathVariable("classId") UUID classId,
                                                    @PathVariable("requestId") UUID requestId,
                                                    @RequestBody(required = false) RejectJoinRequest body) {
        return ok(service.reject(me.getUser(), classId, requestId, body));
    }
}
