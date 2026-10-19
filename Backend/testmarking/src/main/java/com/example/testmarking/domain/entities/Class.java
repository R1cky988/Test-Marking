package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Table(name = "classes", indexes = {
        @Index(name = "idx_classes_created_user", columnList = "created_user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Class {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id", nullable = false)
    private User createdUser;

    @Column(nullable = false)
    private String name;

    @Column(name = "class_code")
    private String classCode;

    @Column(name = "subject")
    private String subject;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Key of the cover image in your storage (MinIO). Optional. */
    @Column(name = "cover_image_key", length = 500)
    private String coverImageKey;

    @Column(name = "class_join_code", unique = true)
    private String classJoinCode;

    /** true = a student who enters the join code creates a ClassJoinRequest the teacher must approve (Examxy behaviour). */
    @Column(name = "require_join_approval", nullable = false)
    private Boolean requireJoinApproval = true;

    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

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

    @PreUpdate
    public void touch() {
        updatedAt = LocalDate.now();
    }
}
