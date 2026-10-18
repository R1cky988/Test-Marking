package com.example.testmarking.domain.ports;

import com.example.testmarking.adapter.rest.dtos.request.LoginRequest;
import com.example.testmarking.adapter.rest.dtos.request.RegisterRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePasswordRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateUserRequest;
import com.example.testmarking.adapter.rest.dtos.response.AuthResponse;
import com.example.testmarking.adapter.rest.dtos.response.UserResponse;

import java.time.LocalDate;

public interface UserPort {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);

    AuthResponse updateProfile(UpdateUserRequest request);

    void updatePassword(UpdatePasswordRequest request);

    UserResponse getCurrentUserToResponse();
}
