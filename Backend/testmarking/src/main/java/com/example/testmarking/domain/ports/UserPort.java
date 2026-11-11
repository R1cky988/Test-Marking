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
    void register(RegisterRequest request);

    AuthResponse updateProfile(UpdateUserRequest request);

    void updatePassword(UpdatePasswordRequest request);

    UserResponse getCurrentUserToResponse();
    AuthResponse verifyEmail(String email, String code);
    void resendVerificationCode(String email);

    AuthResponse refresh(String refreshToken);

    /** Forgot password, step 1: e-mail a 6-digit code to an existing account. */
    void requestPasswordReset(String email);

    /** Step 2: check the code; returns a one-time token for step 3. */
    String verifyPasswordResetCode(String email, String code);

    /** Step 3: set the new password with the token from step 2. */
    void resetPassword(String email, String resetToken, String newPassword);
}
