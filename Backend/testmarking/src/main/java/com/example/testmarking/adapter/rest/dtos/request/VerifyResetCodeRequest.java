package com.example.testmarking.adapter.rest.dtos.request;

import lombok.Data;

/** Step 2: the 6-digit code that was e-mailed. */
@Data
public class VerifyResetCodeRequest {
    private String email;
    private String code;
}
