package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Table(name = "class_student")
@Getter
@Setter
@Data
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

    @Column(name = "joined_at", insertable = false, updatable = false)
    private OffsetDateTime joinedAt; // Matches TIMESTAMP WITH TIME ZONE
}
