package com.example.testmarking.domain.entities;

import com.example.testmarking.domain.entities.enums.ClassPostStatus;
import com.example.testmarking.domain.entities.enums.ClassPostType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** NEW. One entry of the class "stream" (Examxy ClassPost): a post or an announcement written by the teacher. */
@Entity
@Table(name = "class_posts", indexes = {
        @Index(name = "idx_class_post_feed", columnList = "class_id, status, is_pinned, published_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class classEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User author;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 24)
    private ClassPostType type = ClassPostType.POST;

    @Column(name = "title", length = 200)
    private String title;

    /** Rich text (HTML from the editor). The UI shows plain text in lists via a client-side strip. */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private ClassPostStatus status = ClassPostStatus.PUBLISHED;

    @Builder.Default
    @Column(name = "allow_comments", nullable = false)
    private Boolean allowComments = true;

    @Builder.Default
    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    /** Soft delete: the feed query filters deleted_at IS NULL. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        if (uuid == null) uuid = UUID.randomUUID();
        if (status == ClassPostStatus.PUBLISHED && publishedAt == null) publishedAt = LocalDateTime.now();
    }
}
