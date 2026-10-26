package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.request.CommentRequest;
import com.example.testmarking.adapter.rest.dtos.request.CreatePostRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePostRequest;
import com.example.testmarking.adapter.rest.dtos.response.CommentResponse;
import com.example.testmarking.adapter.rest.dtos.response.MessageResponse;
import com.example.testmarking.adapter.rest.dtos.response.PostResponse;
import com.example.testmarking.application.imp.ClassPostImp;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Stream of a class. Posts and comments: every member of the class; what each member may change is checked in the service. */
@RestController
@RequestMapping("/api/v1/classes/{classId}")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ClassPostController {

    private final ClassPostImp service;

    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    @GetMapping("/posts")
    public ApiResponse<List<PostResponse>> feed(@AuthenticationPrincipal SecurityUser me,
                                                @PathVariable("classId") UUID classId) {
        return ok(service.feed(me.getUser(), classId));
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PostResponse> createPost(@AuthenticationPrincipal SecurityUser me,
                                                @PathVariable("classId") UUID classId,
                                                @RequestBody CreatePostRequest body) {
        return ok(service.createPost(me.getUser(), classId, body));
    }

    @PutMapping("/posts/{postId}")
    public ApiResponse<PostResponse> updatePost(@AuthenticationPrincipal SecurityUser me,
                                                @PathVariable("classId") UUID classId,
                                                @PathVariable("postId") UUID postId,
                                                @RequestBody UpdatePostRequest body) {
        return ok(service.updatePost(me.getUser(), classId, postId, body));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<MessageResponse> deletePost(@AuthenticationPrincipal SecurityUser me,
                                                   @PathVariable("classId") UUID classId,
                                                   @PathVariable("postId") UUID postId) {
        service.deletePost(me.getUser(), classId, postId);
        return ok(new MessageResponse("Đã xóa bài đăng"));
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentResponse> addComment(@AuthenticationPrincipal SecurityUser me,
                                                   @PathVariable("classId") UUID classId,
                                                   @PathVariable("postId") UUID postId,
                                                   @RequestBody CommentRequest body) {
        return ok(service.addComment(me.getUser(), classId, postId, body));
    }

    @PutMapping("/comments/{commentId}")
    public ApiResponse<CommentResponse> updateComment(@AuthenticationPrincipal SecurityUser me,
                                                      @PathVariable("classId") UUID classId,
                                                      @PathVariable("commentId") UUID commentId,
                                                      @RequestBody CommentRequest body) {
        return ok(service.updateComment(me.getUser(), classId, commentId, body));
    }

    @DeleteMapping("/comments/{commentId}")
    public ApiResponse<MessageResponse> deleteComment(@AuthenticationPrincipal SecurityUser me,
                                                      @PathVariable("classId") UUID classId,
                                                      @PathVariable("commentId") UUID commentId) {
        service.deleteComment(me.getUser(), classId, commentId);
        return ok(new MessageResponse("Đã xóa bình luận"));
    }

    /** Teacher of the class only (checked in the service). */
    @PostMapping("/comments/{commentId}/hide")
    public ApiResponse<CommentResponse> hideComment(@AuthenticationPrincipal SecurityUser me,
                                                    @PathVariable("classId") UUID classId,
                                                    @PathVariable("commentId") UUID commentId) {
        return ok(service.setCommentHidden(me.getUser(), classId, commentId, true));
    }

    @PostMapping("/comments/{commentId}/unhide")
    public ApiResponse<CommentResponse> unhideComment(@AuthenticationPrincipal SecurityUser me,
                                                      @PathVariable("classId") UUID classId,
                                                      @PathVariable("commentId") UUID commentId) {
        return ok(service.setCommentHidden(me.getUser(), classId, commentId, false));
    }
}
