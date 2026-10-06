package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "question_banks")
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionBank {

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

    @Column(length = 100)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "number_of_questions", nullable = false)
    private Integer numberOfQuestions = 0;

    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate = true;

    @Column(name = "share_link", unique = true, length = 100)
    private String shareLink;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "updated_at")
    private LocalDate updatedAt;

    @PrePersist
    public void generateUuid() {
        if (createdAt == null) {
            createdAt = LocalDate.now();
        }if (updatedAt == null) {
            createdAt = LocalDate.now();
        }
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}
