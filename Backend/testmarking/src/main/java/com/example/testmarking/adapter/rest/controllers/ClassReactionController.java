package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.application.imp.ClassReactionImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Reactions on class posts/comments and "who reacted". Teacher of the class or enrolled student only (checked in the service). */
@RestController
@RequestMapping("/api/v1/web/classes/{classId}")
@PreAuthorize("hasAnyRole('TEACHER','STUDENT')")
@RequiredArgsConstructor
public class ClassReactionController {

    private final ClassReactionImp service;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    /** Body {"reaction_type":"LIKE"} sets or changes, {"reaction_type":null} removes. */
    @PutMapping("/posts/{postId}/reaction")
    public ApiResponse<Map<String, Object>> reactToPost(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                        @PathVariable UUID postId, @RequestBody Map<String, Object> body) {
        return ok(service.setPostReaction(me.getUser(), classId, postId, body));
    }

    @GetMapping("/posts/{postId}/reactions")
    public ApiResponse<List<Map<String, Object>>> postReactors(@AuthenticationPrincipal SecurityUser me,
                                                               @PathVariable UUID classId, @PathVariable UUID postId) {
        return ok(service.postReactors(me.getUser(), classId, postId));
    }

    @PutMapping("/comments/{commentId}/reaction")
    public ApiResponse<Map<String, Object>> reactToComment(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID classId,
                                                           @PathVariable UUID commentId, @RequestBody Map<String, Object> body) {
        return ok(service.setCommentReaction(me.getUser(), classId, commentId, body));
    }

    @GetMapping("/comments/{commentId}/reactions")
    public ApiResponse<List<Map<String, Object>>> commentReactors(@AuthenticationPrincipal SecurityUser me,
                                                                  @PathVariable UUID classId, @PathVariable UUID commentId) {
        return ok(service.commentReactors(me.getUser(), classId, commentId));
    }
}
