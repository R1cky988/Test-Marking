package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.application.imp.ClassDocumentImp;
import com.example.testmarking.application.imp.ClassDocumentImp.FileData;
import com.example.testmarking.adapter.rest.dtos.response.DocumentResponse;
import com.example.testmarking.adapter.rest.dtos.response.MessageResponse;
import com.example.testmarking.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/** Shared files of a class. Upload (multipart), list and download: every member of the class, student or teacher. */
@RestController
@RequestMapping("/api/v1/classes/{classId}/documents")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ClassDocumentController {

    private final ClassDocumentImp service;


    private static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().status(200).message("OK").data(data).build();
    }

    @GetMapping
    public ApiResponse<List<DocumentResponse>> list(@AuthenticationPrincipal SecurityUser me,
                                                    @PathVariable("classId") UUID classId) {
        return ok(service.list(me.getUser(), classId));
    }

    /** multipart/form-data: file (required), title, description, post_id (to attach the file to a post). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DocumentResponse> upload(@AuthenticationPrincipal SecurityUser me,
                                                @PathVariable("classId") UUID classId,
                                                @RequestParam("file") MultipartFile file,
                                                @RequestParam(value = "title", required = false) String title,
                                                @RequestParam(value = "description", required = false) String description,
                                                @RequestParam(value = "post_id", required = false) UUID postId) throws IOException {
        FileData data = new FileData(file.getOriginalFilename(), file.getContentType(), file.getSize(), file.getInputStream());
        return ok(service.upload(me.getUser(), classId, postId, title, description, data));
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal SecurityUser me,
                                                        @PathVariable("classId") UUID classId,
                                                        @PathVariable("documentId") UUID documentId) {
        ClassDocumentImp.Download d = service.download(me.getUser(), classId, documentId);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);   // always a download, never rendered in the browser
        if (d.size() >= 0) response.contentLength(d.size());
        return response.body(new InputStreamResource(d.stream()));
    }

    @DeleteMapping("/{documentId}")
    public ApiResponse<MessageResponse> delete(@AuthenticationPrincipal SecurityUser me,
                                               @PathVariable("classId") UUID classId,
                                               @PathVariable("documentId") UUID documentId) {
        service.delete(me.getUser(), classId, documentId);
        return ok(new MessageResponse("Đã xóa tệp"));
    }
}
