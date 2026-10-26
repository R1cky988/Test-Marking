package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.rest.dtos.request.*;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.domain.ports.UserPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserPort userPort;
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request
    ){
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Login successfully")
                    .data(userPort.login(request))
                    .build());
        }catch (Exception e){
            return ResponseEntity.badRequest().body(
                    ApiResponse.builder()
                            .status(0)
                            .message(e.getMessage())
                            .data(null)
                            .build()
            );
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request
    ){
        try{
            userPort.register(request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Register successfully")
                    .data(null)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.builder()
                            .status(0)
                            .message(e.getMessage())
                            .data(null)
                            .build()
            );
        }
    }

    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody UpdateUserRequest profileRequest
    ){
        try{
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Update successfully")
                    .data(userPort.updateProfile(profileRequest))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }

    @PutMapping("/update-password")
    public ResponseEntity<?> updatePassword(
            @RequestBody UpdatePasswordRequest request
    ){
        try{
            userPort.updatePassword(request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Update password successfully")
                    .data(null)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(){
        try{
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Get user successfully")
                    .data(userPort.getCurrentUserToResponse())
                    .build());
        }catch (Exception e){
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }

    /** body: { "refreshToken": "..." }. 401 when the token is wrong or expired, so the client logs out. */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Refresh successfully")
                    .data(userPort.refresh(request.get("refreshToken")))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }

    /** body: { "email": "..." }. Sends a new 6-digit code (the old one may have expired or the mail may not have arrived). */
    @PostMapping("/resend-code")
    public ResponseEntity<?> resendCode(@RequestBody Map<String, String> request) {
        try {
            userPort.resendVerificationCode(request.get("email"));
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Đã gửi lại mã xác thực")
                    .data(null)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Xác thực email thành công")
                    .data(userPort.verifyEmail(request.getEmail(), request.getCode()))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .status(0)
                    .message(e.getMessage())
                    .data(null)
                    .build());
        }
    }
}
