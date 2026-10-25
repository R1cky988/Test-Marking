package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.application.imp.TestLayoutImp;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.domain.entities.TestLayout;
import com.example.testmarking.domain.entities.User;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Port of NestJS TemplatesController. Request bodies are plain Maps and the TestLayout entity is
 * returned as JSON (see the Jackson annotations on the entity). Needs @EnableMethodSecurity (you have it).
 */
@RestController
@RequestMapping("/api/v1/web/templates")
@PreAuthorize("hasRole('TEACHER')")
public class TestLayoutController {

    private final TestLayoutImp service;

    public TestLayoutController(TestLayoutImp service) {
        this.service = service;
    }

    private static <T> ApiResponse<T> ok(int status, String message, T data) {
        return ApiResponse.<T>builder().status(status).message(message).data(data).build();
    }

    @GetMapping
    public ApiResponse<List<TestLayout>> findAll(@AuthenticationPrincipal SecurityUser me,
                                                 @RequestParam(required = false) String status) {
        return ok(200, "OK", service.findAll(me.getUser(), status));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TestLayout> create(@AuthenticationPrincipal SecurityUser me,
                                          @RequestBody Map<String, Object> body) {
        return ok(201, "Created", service.create(me.getUser(), body));
    }

    @PostMapping("/preview")
    public ApiResponse<List<Map<String, Object>>> preview(@RequestBody Map<String, Object> gridConfig) {
        return ok(200, "OK", service.preview(gridConfig));
    }

    @GetMapping(value = "/{templateId}/image", produces = "image/svg+xml;charset=UTF-8")
    public String image(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID templateId) {
        return service.getTemplateImage(me.getUser(), templateId);
    }

    @GetMapping("/{templateId}/download")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID templateId) {
        TestLayoutImp.Asset asset = service.downloadTemplateAsset(me.getUser(), templateId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(asset.filename(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(asset.contentType()))
                .contentLength(asset.bytes().length)
                .body(asset.bytes());
    }

    @GetMapping("/{templateId}")
    public ApiResponse<TestLayout> findOne(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID templateId) {
        return ok(200, "OK", service.findOne(me.getUser(), templateId));
    }

    @PutMapping("/{templateId}")
    public ApiResponse<TestLayout> update(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID templateId,
                                          @RequestBody Map<String, Object> body) {
        return ok(200, "OK", service.update(me.getUser(), templateId, body));
    }

    @DeleteMapping("/{templateId}")
    public ApiResponse<Map<String, String>> remove(@AuthenticationPrincipal SecurityUser me, @PathVariable UUID templateId) {
        service.remove(me.getUser(), templateId);
        return ok(200, "Xóa mẫu phiếu thành công", Map.of("message", "Xóa mẫu phiếu thành công"));
    }
}
