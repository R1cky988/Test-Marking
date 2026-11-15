package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.response.UserResponse;
import com.example.testmarking.application.imp.AvatarImp;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.domain.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * POST /api/v1/user/avatar            multipart "file" (JPG/PNG/WEBP, max 2MB): the logged in user's picture, answers the new profile
 * GET  /api/v1/user/avatars/{u}/{f}   the picture itself. Public like any profile picture (a plain img tag cannot send a token);
 *                                     the file name is a random UUID, so it cannot be guessed.
 */
@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class AvatarController {
    private final AvatarImp avatars;

    @PreAuthorize("isAuthenticated()")
    @PostMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> update(@AuthenticationPrincipal SecurityUser me, @RequestParam("file") MultipartFile file) throws IOException {
        User user = avatars.update(me.getUser(), file.getContentType(), file.getSize(), file.getInputStream());
        return ApiResponse.<UserResponse>builder().status(1).message("Update avatar successfully").data(UserResponse.builder()
                .uuid(user.getUuid()).email(user.getEmail()).phoneNumber(user.getPhoneNumber())
                .firstName(user.getFirstName()).lastName(user.getLastName()).dob(user.getDob()).gender(user.getGender())
                .role(user.getRole()).avatarUrl(user.getAvatarUrl()).createdAt(user.getCreatedAt()).updatedAt(user.getUpdatedAt())
                .build()).build();
    }

    @GetMapping("/avatars/{userId}/{file}")
    public ResponseEntity<InputStreamResource> get(@PathVariable("userId") String userId, @PathVariable("file") String file) {
        AvatarImp.Download d = avatars.download(userId, file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(d.contentType()))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(new InputStreamResource(d.stream()));
    }
}
