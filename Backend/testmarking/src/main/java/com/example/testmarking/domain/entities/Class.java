package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Table(name = "classes")
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Class {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id", nullable = false, unique = true)
    private User createdUser;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "class_code", nullable = true)
    private String classCode;

    @Column(name = "subject")
    private String subject;

    @Column(name = "class_join_code")
    private String classJoinCode;

    @Column(name = "is_archived")
    private Boolean isArchived;

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
