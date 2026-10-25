package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassPostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassPostCommentRepository extends JpaRepository<ClassPostComment, Long> {

    @Query("select c from ClassPostComment c join fetch c.post p join fetch p.classEntity join fetch c.author where c.uuid = :uuid")
    Optional<ClassPostComment> findByUuid(@Param("uuid") UUID uuid);

    /** All live comments of several posts in one query, oldest first. */
    @Query("select c from ClassPostComment c join fetch c.author left join fetch c.parentComment "
            + "where c.post.id in :postIds and c.deletedAt is null order by c.createdAt asc")
    List<ClassPostComment> findByPostIds(@Param("postIds") Collection<Long> postIds);
}
