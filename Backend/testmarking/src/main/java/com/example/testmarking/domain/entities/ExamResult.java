package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "exam_results", indexes = {
        @Index(name = "idx_exam_result_student", columnList = "student_id"),
        @Index(name = "idx_exam_result_examination", columnList = "examination_id"),
        @Index(name = "idx_exam_result_source", columnList = "submission_source")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "uuid", nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    // Người thực hiện tải lên/chấm bài (Giáo viên hoặc chính Sinh viên)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_user_id")
    private User submittedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_code_id")
    private TestCode testCode;

    @Builder.Default
    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber = 1;

    @Builder.Default
    @Column(name = "is_latest", nullable = false)
    private Boolean isLatest = true;

    @Column(name = "total_score", precision = 4, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "total_correct")
    private Integer totalCorrect;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    // Nguồn tạo bài nộp: 'TEACHER_OFFLINE', 'STUDENT_SCAN', 'ONLINE_FORM'
    @Builder.Default
    @Column(name = "submission_source", length = 50, nullable = false)
    private String submissionSource = "TEACHER_OFFLINE";

    // Trạng thái nhận diện: 'SUCCESS', 'UNIDENTIFIED_STUDENT', 'OMR_ERROR', 'NEEDS_REVIEW'
    @Builder.Default
    @Column(name = "processing_status", length = 50, nullable = false)
    private String processingStatus = "SUCCESS";

    // Storage references for MinIO / S3
    @Column(name = "image_raw_rust_key", length = 500)
    private String imageRawRustKey;

    @Column(name = "image_dewarped_rust_key", length = 500)
    private String imageDewarpedRustKey;

    @Column(name = "image_marked_rust_key", length = 500)
    private String imageMarkedRustKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
        if (this.attemptNumber == null) {
            this.attemptNumber = 1;
        }
        if (this.isLatest == null) {
            this.isLatest = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}