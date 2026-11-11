package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One student's go at an ONLINE exam, made on the phone. It starts when the student downloads the paper (online) and lives on
 * while he works, possibly without network; the phone keeps the answers and sends them with {@code POST .../attempt/sync}.
 * The paper is only marked when the final sync arrives, so {@code syncedAt} is when the server received it.
 *
 * status: IN_PROGRESS | LOCKED (left the screen; the teacher must unlock) | SUBMITTED.
 * answers: "1=A;2=B,C" (question number = chosen labels), see OnlineExamRules.
 */
@Entity
@Table(name = "exam_attempts", uniqueConstraints = {
        @UniqueConstraint(name = "unique_exam_attempt_student", columnNames = {"examination_id", "student_id"})
}, indexes = {
        @Index(name = "idx_exam_attempt_exam", columnList = "examination_id")
})
@Getter
@Setter
@NoArgsConstructor
public class ExamAttempt {
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String LOCKED = "LOCKED";
    public static final String SUBMITTED = "SUBMITTED";

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
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    /** The version this student got. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_code_id", nullable = false)
    private TestCode testCode;

    @Column(name = "status", nullable = false, length = 20)
    private String status = IN_PROGRESS;

    /** Server time at which the paper was handed out. */
    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    /** The end of this student's working time (a teacher's unlock pushes it back by the time he was locked). */
    @Column(name = "deadline_at", nullable = false)
    private OffsetDateTime deadlineAt;

    @Column(name = "answers", columnDefinition = "text")
    private String answers;

    /** Where the student was (0-based), so a reinstall or a second look continues at the same question. */
    @Column(name = "current_index", nullable = false)
    private Integer currentIndex = 0;

    /** How many times he left the exam screen (counted on the phone, the server keeps the highest number it was told). */
    @Column(name = "left_count", nullable = false)
    private Integer leftCount = 0;

    @Column(name = "last_left_at")
    private OffsetDateTime lastLeftAt;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @Column(name = "lock_reason", length = 200)
    private String lockReason;

    @Column(name = "unlocked_at")
    private OffsetDateTime unlockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unlocked_by_user_id")
    private User unlockedBy;

    /** Last time the phone talked to the server (progress, heartbeat or final sync). */
    @Column(name = "last_sync_at")
    private OffsetDateTime lastSyncAt;

    /** When the student pressed "Nộp bài" (or the time ran out) according to the phone's clock. */
    @Column(name = "client_finished_at")
    private OffsetDateTime clientFinishedAt;

    /** When the server received the final answers and marked the paper. */
    @Column(name = "synced_at")
    private OffsetDateTime syncedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_result_id")
    private ExamResult examResult;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (uuid == null) uuid = UUID.randomUUID();
        if (status == null) status = IN_PROGRESS;
        if (currentIndex == null) currentIndex = 0;
        if (leftCount == null) leftCount = 0;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
