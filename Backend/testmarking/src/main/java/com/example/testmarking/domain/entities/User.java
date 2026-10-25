package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.Role;
import com.example.testmarking.domain.entities.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;

@Data
@Entity
@Getter
@Setter
@Table(name = "user")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dob;

    @Column(nullable = true)
    private String gender;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(nullable = false)
    private UserStatus status = UserStatus.PENDING;

    @Column(name = "email_verified_at")
    private LocalDate emailVerifiedAt;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "updated_at")
    private LocalDate updatedAt;

    @PrePersist
    public void generateUuid() {
        createdAt = LocalDate.now();
        if (updatedAt == null) {
            updatedAt = LocalDate.now();
        }
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}
