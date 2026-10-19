package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One table for BOTH Examxy concepts:
 *  - post == null  -> a file in the class "Files" tab (Examxy ClassMaterial)
 *  - post != null  -> a file attached to a post        (Examxy ClassPostAttachment)
 * So the Files tab simply lists every document of the class, and a post lists its own.
 *
 * CHANGED: field classId (type Class) renamed to classEntity, @Data removed, added post + deletedAt.
 */
@Table(name = "class_documents", indexes = {
        @Index(name = "idx_class_document_class", columnList = "class_id, created_at"),
        @Index(name = "idx_class_document_post", columnList = "post_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class ClassDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "uuid", nullable = false, unique = true)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class classEntity;

    /** Set when the file was attached to a post. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private ClassPost post;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Object key in your storage (MinIO bucket). Never a public URL: downloads go through the API. */
    @Column(name = "file_path", nullable = false, length = 512)
    private String filePath;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    private User uploadedByUser;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

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
    }
}
