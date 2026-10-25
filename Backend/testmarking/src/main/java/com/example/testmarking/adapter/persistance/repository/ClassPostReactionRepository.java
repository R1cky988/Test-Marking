package com.example.testmarking.adapter.persistance.repository;

import com.example.testmarking.domain.entities.ClassPostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClassPostReactionRepository extends JpaRepository<ClassPostReaction, Long> {

    Optional<ClassPostReaction> findByPost_IdAndUser_Id(Long postId, Long userId);

    /** rows of [reactionType, count] */
    @Query("select r.reactionType, count(r) from ClassPostReaction r where r.post.id = :postId group by r.reactionType")
    List<Object[]> countByType(@Param("postId") Long postId);

    /** Who reacted, newest first. The user is fetched so no lazy loading happens later. */
    @Query("select r from ClassPostReaction r join fetch r.user where r.post.id = :postId order by r.createdAt desc")
    List<ClassPostReaction> findReactors(@Param("postId") Long postId);

    /** Feed: rows of [postId, reactionType, count] for many posts at once. */
    @Query("select r.post.id, r.reactionType, count(r) from ClassPostReaction r where r.post.id in :postIds "
            + "group by r.post.id, r.reactionType")
    List<Object[]> countByTypeForPosts(@Param("postIds") Collection<Long> postIds);

    /** Feed: rows of [postId, reactionType] of one viewer. */
    @Query("select r.post.id, r.reactionType from ClassPostReaction r where r.post.id in :postIds and r.user.id = :userId")
    List<Object[]> findViewerReactions(@Param("postIds") Collection<Long> postIds, @Param("userId") Long userId);
}
