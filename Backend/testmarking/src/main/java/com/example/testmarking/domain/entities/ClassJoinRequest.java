package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * CHANGED: the unique constraint (class_id, student_id, status) is removed. It allowed only ONE rejected
 * (or approved/canceled) row per student per class, so a student rejected twice would crash with a
 * duplicate-key error. "Only one PENDING request" is checked in the service instead:
 *   if (repo.existsByClazzAndStudentAndStatus(cls, student, PENDING)) -> 409.
 * (A Postgres partial unique index on status='PENDING' also works, but Hibernate can't declare it.)
 */
@Entity
@Table(name = "class_join_requests", indexes = {
        @Index(name = "idx_join_request_class_status", columnList = "class_id, status"),
        @Index(name = "idx_join_request_student", columnList = "student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassJoinRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "uuid", nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status;

    @Column(name = "student_message", length = 500)
    private String studentMessage;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_user_id")
    private User processedByUser;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void ensureUuid() {
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
        if (this.status == null) {
            this.status = RequestStatus.PENDING;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ClassJoinRequest that = (ClassJoinRequest) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
