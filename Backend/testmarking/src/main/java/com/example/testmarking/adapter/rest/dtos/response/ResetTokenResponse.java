package com.example.testmarking.adapter.rest.dtos.response;

import lombok.Builder;
import lombok.Getter;

/** Answer of step 2: send this token back together with the new password. */
@Getter
@Builder
public class ResetTokenResponse {
    private String resetToken;
}
