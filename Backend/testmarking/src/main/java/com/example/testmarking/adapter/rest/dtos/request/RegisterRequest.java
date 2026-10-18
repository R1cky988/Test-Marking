package com.example.testmarking.adapter.rest.dtos.request;

import com.example.testmarking.domain.entities.enums.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;

@Getter
@RequiredArgsConstructor
@Builder
public class RegisterRequest {
    private String email;
    private String phoneNumber;
    private String password;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String gender;
    private Role role;
}
