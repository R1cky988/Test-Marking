package com.example.testmarking.adapter.rest.dtos.request;

import lombok.Data;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Data
@Getter
@Setter
@RequiredArgsConstructor
public class UpdateUserRequest {
    private String email;
    private String phoneNumber;
    private String firstName;
    private String lastName;
}