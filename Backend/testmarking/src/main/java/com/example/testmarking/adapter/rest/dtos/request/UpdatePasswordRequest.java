package com.example.testmarking.adapter.rest.dtos.request;

import lombok.Data;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Data
@Setter
@Getter
@RequiredArgsConstructor
public class UpdatePasswordRequest {
    private String oldPassword;
    private String newPassword;
}
