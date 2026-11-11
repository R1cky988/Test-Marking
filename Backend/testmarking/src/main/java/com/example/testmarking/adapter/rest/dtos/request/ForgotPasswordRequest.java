package com.example.testmarking.adapter.rest.dtos.request;

import lombok.Data;

/** Step 1 of "forgot password": which account to send the code to. */
@Data
public class ForgotPasswordRequest {
    private String email;
}
