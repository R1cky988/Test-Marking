package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.persistance.security.SecurityUser;
import com.example.testmarking.adapter.rest.dtos.response.ImportStudentsResponse;
import com.example.testmarking.application.imp.StudentImportImp;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/** Teacher of the class imports students from an .xlsx (columns STT, Name, Registed Email). The service checks he teaches THIS class. */
@RestController
@RequestMapping("/api/v1/classes/{classId}/students")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ClassStudentImportController {

    private final StudentImportImp service;

    /** multipart/form-data: file (.xlsx). New e-mails get an account + the login by e-mail; existing ones are skipped. */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImportStudentsResponse> importStudents(@AuthenticationPrincipal SecurityUser me,
                                                              @PathVariable("classId") UUID classId,
                                                              @RequestParam("file") MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx")) {
            throw TemplateException.badRequestWithCode("NOT_XLSX", "Chỉ nhận tệp Excel .xlsx");
        }
        ImportStudentsResponse result = service.importStudents(me.getUser(), classId, file.getBytes());
        return ApiResponse.<ImportStudentsResponse>builder().status(200).message("OK").data(result).build();
    }
}
