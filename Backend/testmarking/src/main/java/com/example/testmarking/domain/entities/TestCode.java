package com.example.testmarking.domain.entities;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_codes", uniqueConstraints = {
        @UniqueConstraint(name = "unique_exam_code", columnNames = {"examination_id", "code_number"})
})
@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @Column(name = "code_number", nullable = false, length = 20)
    private String codeNumber;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @PrePersist
    public void generateUuid() {
        if (createdAt == null) {
            createdAt = LocalDate.now();
        }
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}
