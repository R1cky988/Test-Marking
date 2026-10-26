package com.example.testmarking.adapter.rest.dtos.request;

import lombok.*;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    private String email;
    private String phoneNumber;
    private String password;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String gender;
}
