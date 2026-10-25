package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassDocumentRepository extends JpaRepository<ClassDocument, Long> {

    @Query("select d from ClassDocument d join fetch d.classEntity left join fetch d.post where d.uuid = :uuid")
    Optional<ClassDocument> findByUuid(@Param("uuid") UUID uuid);

    /** Files tab: every live document of the class (also the ones attached to posts). */
    @Query("select d from ClassDocument d join fetch d.uploadedByUser "
            + "where d.classEntity.id = :classId and d.deletedAt is null order by d.createdAt desc")
    List<ClassDocument> findByClass(@Param("classId") Long classId);

    @Query("select d from ClassDocument d join fetch d.uploadedByUser where d.post.id in :postIds and d.deletedAt is null order by d.createdAt asc")
    List<ClassDocument> findByPostIds(@Param("postIds") Collection<Long> postIds);
}
