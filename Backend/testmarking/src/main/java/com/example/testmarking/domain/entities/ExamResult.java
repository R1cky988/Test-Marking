package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "exam_results", uniqueConstraints = {
        @UniqueConstraint(name = "unique_student_exam_attempt", columnNames = {"examination_id", "student_id", "attempt_number"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_code_id", nullable = false)
    private TestCode testCode;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber = 1;

    @Column(name = "is_latest", nullable = false)
    private Boolean isLatest = true;

    @Column(name = "total_score", precision = 4, scale = 2, nullable = false)
    private BigDecimal totalScore;

    @Column(name = "total_correct", nullable = false)
    private Integer totalCorrect;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "image_raw_rust_key", length = 500)
    private String imageRawRustKey;

    @Column(name = "image_marked_rust_key", length = 500)
    private String imageMarkedRustKey;

    @Column(name = "created_at", nullable = false)
    private LocalDate createdAt;

    @Column(name = "updated_at", nullable = false)
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
