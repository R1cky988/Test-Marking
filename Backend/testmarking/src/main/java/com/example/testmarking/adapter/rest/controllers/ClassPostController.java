package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.application.imp.ClassPostImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Stream of a class. Posts: teacher only. Comments: every member. */
@RestController
@RequestMapping("/api/v1/web/classes/{classId}")
@PreAuthorize("hasAnyRole('TEACHER','STUDENT')")
@RequiredArgsConstructor
public class ClassPostController {

    private final ClassPostImp service;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    @GetMapping("/posts")
    public ApiResponse<List<Map<String, Object>>> feed(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId) {
        return ok(service.feed(me.getUser(), classId));
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createPost(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                       @RequestBody Map<String, Object> body) {
        return ok(service.createPost(me.getUser(), classId, body));
    }

    @PutMapping("/posts/{postId}")
    public ApiResponse<Map<String, Object>> updatePost(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                       @PathVariable UUID postId, @RequestBody Map<String, Object> body) {
        return ok(service.updatePost(me.getUser(), classId, postId, body));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Map<String, String>> deletePost(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                       @PathVariable UUID postId) {
        service.deletePost(me.getUser(), classId, postId);
        return ok(Map.of("message", "Đã xóa bài đăng"));
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> addComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                       @PathVariable UUID postId, @RequestBody Map<String, Object> body) {
        return ok(service.addComment(me.getUser(), classId, postId, body));
    }

    @PutMapping("/comments/{commentId}")
    public ApiResponse<Map<String, Object>> updateComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                          @PathVariable UUID commentId, @RequestBody Map<String, Object> body) {
        return ok(service.updateComment(me.getUser(), classId, commentId, body));
    }

    @DeleteMapping("/comments/{commentId}")
    public ApiResponse<Map<String, String>> deleteComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                          @PathVariable UUID commentId) {
        service.deleteComment(me.getUser(), classId, commentId);
        return ok(Map.of("message", "Đã xóa bình luận"));
    }

    @PostMapping("/comments/{commentId}/hide")
    public ApiResponse<Map<String, Object>> hideComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                        @PathVariable UUID commentId) {
        return ok(service.setCommentHidden(me.getUser(), classId, commentId, true));
    }

    @PostMapping("/comments/{commentId}/unhide")
    public ApiResponse<Map<String, Object>> unhideComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                          @PathVariable UUID commentId) {
        return ok(service.setCommentHidden(me.getUser(), classId, commentId, false));
    }
}
