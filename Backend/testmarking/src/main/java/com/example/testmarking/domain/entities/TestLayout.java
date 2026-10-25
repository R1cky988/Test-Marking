package com.example.testmarking.domain.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonRawValue;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_layouts", indexes = {
        @Index(name = "idx_test_layout_status", columnList = "status"),
        @Index(name = "idx_test_layout_is_active", columnList = "is_active"),
        @Index(name = "idx_test_layout_creator_status", columnList = "created_user_id, status, created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestLayout {

    @JsonIgnore
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonProperty("uuid")
    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id", nullable = false)
    private User createdUser;

    @Column(nullable = false, length = 200)
    private String name;

    // Exam Hub: version string, bumped when the layout formula or schema changes
    @Builder.Default
    @JsonProperty("version")
    @Column(name = "version", nullable = false, length = 20)
    private String version = "1.0.0";

    // Exam Hub: STANDARD / CUSTOM / LEGACY
    @Builder.Default
    @JsonProperty("template_type")
    @Column(name = "template_type", nullable = false, length = 20)
    private String templateType = "CUSTOM";

    // CHANGED: now nullable. The sheet is drawn from JSON; an image is optional.
    @JsonIgnore
    @Column(name = "image_rust_key", length = 500)
    private String imageRustKey;

    @JsonProperty("preview_image_url")
    @Column(name = "preview_image_url", length = 500)
    private String previewImageUrl;

    @JsonProperty("paper_size")
    @Builder.Default
    @Column(name = "paper_size", length = 20, nullable = false)
    private String paperSize = "A4";


    @JsonProperty("canvas_width")
    @Builder.Default @Column(name = "canvas_width", nullable = false)
    private Integer canvasWidth = 827;
    @JsonProperty("canvas_height")
    @Builder.Default @Column(name = "canvas_height", nullable = false)
    private Integer canvasHeight = 1169;

    // Exam Hub's two JSON columns
    @JsonProperty("anchor_points") @JsonRawValue   // the column already holds JSON text
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "anchor_points", columnDefinition = "jsonb", nullable = false)
    private String anchorPoints;   // [{id, abs_x, abs_y, u, v}] x 12

    @JsonProperty("grid_config") @JsonRawValue
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "grid_config", columnDefinition = "jsonb", nullable = false)
    private String gridConfig;     // {anchor_points, fixed_zones, id_zones, answer_zones}

    // Denormalised for list screens; compute from grid_config on every save
    @JsonProperty("total_questions")
    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;
    @JsonProperty("choices_per_question")
    @Column(name = "choices_per_question", nullable = false)
    private Integer choicesPerQuestion;

    // So an old scanner can refuse a layout it can't read (Exam Hub columns)
    @JsonProperty("compatibility_hash")
    @Column(name = "compatibility_hash", length = 64)
    private String compatibilityHash;
    @JsonProperty("min_app_version")
    @Column(name = "min_app_version", length = 10)
    private String minAppVersion;

    @Builder.Default @Column(name = "status", length = 50, nullable = false)
    private String status = "DRAFT";      // DRAFT / PUBLISHED / ARCHIVED

    @JsonProperty("is_active")
    @Builder.Default @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @JsonProperty("created_at")
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @JsonProperty("updated_at")
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
