package com.example.testmarking.adapter.rest.dtos.response;

import com.example.testmarking.domain.entities.enums.Role;
import com.example.testmarking.domain.entities.enums.UserStatus;
import jakarta.persistence.Column;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Getter
@Setter
@Builder
@RequiredArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID uuid;

    private String email;

    private String phoneNumber;

    private String firstName;

    private String lastName;

    private LocalDate dob;

    private String gender;

    private Role role;

    private LocalDate createdAt;

    private LocalDate updatedAt;
}
