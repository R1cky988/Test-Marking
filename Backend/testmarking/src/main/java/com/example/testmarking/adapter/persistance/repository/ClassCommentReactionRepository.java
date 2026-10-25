package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassCommentReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClassCommentReactionRepository extends JpaRepository<ClassCommentReaction, Long> {

    Optional<ClassCommentReaction> findByComment_IdAndUser_Id(Long commentId, Long userId);

    @Query("select r.reactionType, count(r) from ClassCommentReaction r where r.comment.id = :commentId group by r.reactionType")
    List<Object[]> countByType(@Param("commentId") Long commentId);

    @Query("select r from ClassCommentReaction r join fetch r.user where r.comment.id = :commentId order by r.createdAt desc")
    List<ClassCommentReaction> findReactors(@Param("commentId") Long commentId);

    @Query("select r.comment.id, r.reactionType, count(r) from ClassCommentReaction r where r.comment.id in :commentIds "
            + "group by r.comment.id, r.reactionType")
    List<Object[]> countByTypeForComments(@Param("commentIds") Collection<Long> commentIds);

    @Query("select r.comment.id, r.reactionType from ClassCommentReaction r where r.comment.id in :commentIds and r.user.id = :userId")
    List<Object[]> findViewerReactions(@Param("commentIds") Collection<Long> commentIds, @Param("userId") Long userId);
}
