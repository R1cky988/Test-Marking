package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_layouts")
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestLayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id", nullable = false)
    private User createdUser;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "image_rust_key", nullable = false, length = 500)
    private String imageRustKey;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String coordinates;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions = 50;

    @Column(name = "choices_per_question", nullable = false)
    private Integer choicesPerQuestion = 4;

    @Column(name = "number_of_bubbles", nullable = false)
    private Integer numberOfBubbles;

    @Column(name = "number_of_sub_info", nullable = false)
    private Integer numberOfSubInfo = 0;

    @Column(name = "is_system_default", nullable = false)
    private Boolean isSystemDefault = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "updated_at")
    private LocalDate updatedAt;

    @PrePersist
    public void generateUuid() {
        if (createdAt == null) {
            createdAt = LocalDate.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDate.now();
        }
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}