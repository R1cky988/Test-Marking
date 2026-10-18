package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.adapter.rest.dtos.request.LoginRequest;
import com.example.testmarking.adapter.rest.dtos.request.RegisterRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePasswordRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateUserRequest;
import com.example.testmarking.common.ApiResponse;
import com.example.testmarking.domain.ports.UserPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            return ResponseEntity.ok(ApiResponse.builder()
                    .status(1)
                    .message("Register successfully")
                    .data(userPort.register(request))
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
}
