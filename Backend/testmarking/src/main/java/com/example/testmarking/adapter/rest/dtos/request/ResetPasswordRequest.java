package com.example.testmarking.adapter.rest.dtos.request;

import lombok.Data;

/** Step 3: the token from step 2 plus the new password. */
@Data
public class ResetPasswordRequest {
    private String email;
    private String resetToken;
    private String newPassword;
}
