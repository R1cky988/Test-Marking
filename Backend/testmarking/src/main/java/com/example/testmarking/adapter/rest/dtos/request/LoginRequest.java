package com.example.testmarking.adapter.rest.dtos.request;

import lombok.*;

@Getter
@Data
@Setter
@RequiredArgsConstructor
public class LoginRequest {
    private String email;
    private String password;
}
