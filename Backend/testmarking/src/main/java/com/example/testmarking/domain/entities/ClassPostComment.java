package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** NEW. Comment (or reply, via parentComment) under a ClassPost. Teachers can hide a comment (Examxy "hide/unhide"). */
@Entity
@Table(name = "class_post_comments", indexes = {
        @Index(name = "idx_class_comment_post", columnList = "post_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassPostComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private ClassPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private ClassPostComment parentComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User author;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hidden_by_user_id")
    private User hiddenByUser;

    @Column(name = "hidden_at")
    private LocalDateTime hiddenAt;

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
    }
}
