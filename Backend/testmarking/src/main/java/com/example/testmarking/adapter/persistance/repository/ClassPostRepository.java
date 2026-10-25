package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassPostRepository extends JpaRepository<ClassPost, Long> {

    @Query("select p from ClassPost p join fetch p.classEntity join fetch p.author where p.uuid = :uuid")
    Optional<ClassPost> findByUuid(@Param("uuid") UUID uuid);

    /** Stream of a class: pinned first, then newest. Teachers also see drafts. */
    @Query("select p from ClassPost p join fetch p.author "
            + "where p.classEntity.id = :classId and p.deletedAt is null "
            + "and (:includeDrafts = true or p.status <> com.example.testmarking.domain.entities.enums.ClassPostStatus.DRAFT) "
            + "order by p.isPinned desc, coalesce(p.publishedAt, p.createdAt) desc")
    List<ClassPost> findFeed(@Param("classId") Long classId, @Param("includeDrafts") boolean includeDrafts);
}
