package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * CHANGED: joinedAt was insertable=false/updatable=false, so with ddl-auto=update (no DB default)
 * it would always be NULL. It is now set in @PrePersist. Added a unique (class, student) pair.
 */
@Table(name = "class_student", uniqueConstraints = {
        @UniqueConstraint(name = "uk_class_student", columnNames = {"class_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class ClassStudent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class classEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    public void onCreate() {
        if (joinedAt == null) {
            joinedAt = OffsetDateTime.now();
        }
    }
}
