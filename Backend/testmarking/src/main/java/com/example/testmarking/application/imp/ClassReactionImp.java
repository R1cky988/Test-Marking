package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.enums.ClassPostStatus;
import com.example.testmarking.domain.entities.enums.ClassReactionType;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Reactions (like / love / haha / wow / sad / angry) on class posts and comments, and the list of who reacted.
 * One reaction per user per post/comment, sending no type removes it, any member of the class (its teacher or an
 * enrolled student) can react and can see who reacted.
 */
@Service
@RequiredArgsConstructor
public class ClassReactionImp {

    private final ClassPostRepository posts;
    private final ClassPostCommentRepository comments;
    private final ClassAccessImp access;
    private final ClassPostReactionRepository postReactions;
    private final ClassCommentReactionRepository commentReactions;

    // ─── posts ───────────────────────────────────────────────────

    /** body: { "reaction_type": "LIKE" } to set/change, { "reaction_type": null } to remove. Returns the new summary. */
    @Transactional
    public Map<String, Object> setPostReaction(User me, UUID classId, UUID postId, Map<String, Object> body) {
        ClassPost post = requirePost(me, classId, postId);
        ClassReactionType type = parseType(body);
        Optional<ClassPostReaction> existing = postReactions.findByPost_IdAndUser_Id(post.getId(), me.getId());
        if (type == null) {
            existing.ifPresent(postReactions::delete);
        } else if (existing.isPresent()) {
            if (existing.get().getReactionType() != type) {
                existing.get().setReactionType(type);
                postReactions.save(existing.get());
            }
        } else {
            postReactions.save(ClassPostReaction.builder().post(post).user(me).reactionType(type).build());
        }
        return postSummary(post.getId(), me.getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> postReactors(User me, UUID classId, UUID postId) {
        ClassPost post = requirePost(me, classId, postId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ClassPostReaction r : postReactions.findReactors(post.getId())) {
            out.add(reactor(r.getUser(), r.getReactionType(), r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt()));
        }
        return out;
    }

    /** Summary of one post as seen by one viewer. */
    @Transactional(readOnly = true)
    public Map<String, Object> postSummary(Long postId, Long viewerUserId) {
        ClassReactionType mine = postReactions.findByPost_IdAndUser_Id(postId, viewerUserId)
                .map(ClassPostReaction::getReactionType).orElse(null);
        return summary(postReactions.countByType(postId), mine);
    }

    /** For the feed: summaries of many posts in two queries. Posts nobody reacted to get an empty summary. */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> postSummaries(Collection<Long> postIds, Long viewerUserId) {
        if (postIds.isEmpty()) return Map.of();
        return summaries(postIds, postReactions.countByTypeForPosts(postIds), postReactions.findViewerReactions(postIds, viewerUserId));
    }

    // ─── comments ────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> setCommentReaction(User me, UUID classId, UUID commentId, Map<String, Object> body) {
        ClassPostComment comment = requireComment(me, classId, commentId);
        ClassReactionType type = parseType(body);
        Optional<ClassCommentReaction> existing = commentReactions.findByComment_IdAndUser_Id(comment.getId(), me.getId());
        if (type == null) {
            existing.ifPresent(commentReactions::delete);
        } else if (existing.isPresent()) {
            if (existing.get().getReactionType() != type) {
                existing.get().setReactionType(type);
                commentReactions.save(existing.get());
            }
        } else {
            commentReactions.save(ClassCommentReaction.builder().comment(comment).user(me).reactionType(type).build());
        }
        return commentSummary(comment.getId(), me.getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> commentReactors(User me, UUID classId, UUID commentId) {
        ClassPostComment comment = requireComment(me, classId, commentId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ClassCommentReaction r : commentReactions.findReactors(comment.getId())) {
            out.add(reactor(r.getUser(), r.getReactionType(), r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> commentSummary(Long commentId, Long viewerUserId) {
        ClassReactionType mine = commentReactions.findByComment_IdAndUser_Id(commentId, viewerUserId)
                .map(ClassCommentReaction::getReactionType).orElse(null);
        return summary(commentReactions.countByType(commentId), mine);
    }

    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> commentSummaries(Collection<Long> commentIds, Long viewerUserId) {
        if (commentIds.isEmpty()) return Map.of();
        return summaries(commentIds, commentReactions.countByTypeForComments(commentIds), commentReactions.findViewerReactions(commentIds, viewerUserId));
    }

    // ─── helpers ─────────────────────────────────────────────────

    private ClassPost requirePost(User me, UUID classId, UUID postId) {
        ClassPost post = posts.findByUuid(postId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> TemplateException.notFound("POST_NOT_FOUND", "Bài đăng không tồn tại"));
        Access a = access.requireMember(me, classId);
        if (!post.getClassEntity().getId().equals(a.cls().getId())
                || (post.getStatus() == ClassPostStatus.DRAFT && !a.owner())) {
            throw TemplateException.notFound("POST_NOT_FOUND", "Bài đăng không tồn tại");
        }
        return post;
    }

    private ClassPostComment requireComment(User me, UUID classId, UUID commentId) {
        ClassPostComment c = comments.findByUuid(commentId)
                .filter(x -> x.getDeletedAt() == null && !Boolean.TRUE.equals(x.getIsHidden()))
                .orElseThrow(() -> TemplateException.notFound("COMMENT_NOT_FOUND", "Bình luận không tồn tại"));
        ClassPost post = c.getPost();
        Access a = access.requireMember(me, classId);
        if (post.getDeletedAt() != null || !post.getClassEntity().getId().equals(a.cls().getId())
                || (post.getStatus() == ClassPostStatus.DRAFT && !a.owner())) {
            throw TemplateException.notFound("COMMENT_NOT_FOUND", "Bình luận không tồn tại");
        }
        return c;
    }

    private static ClassReactionType parseType(Map<String, Object> body) {
        Object raw = body == null ? null : body.get("reaction_type");
        if (raw == null) return null;
        if (raw instanceof String s) {
            try {
                return ClassReactionType.valueOf(s.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // fall through
            }
        }
        throw TemplateException.badRequest("reaction_type không hợp lệ",
                "reaction_type must be one of " + Arrays.toString(ClassReactionType.values()) + " or null");
    }

    private static Map<Long, Map<String, Object>> summaries(Collection<Long> ids, List<Object[]> counts, List<Object[]> mine) {
        Map<Long, List<Object[]>> countsById = new HashMap<>();
        for (Object[] row : counts) {
            countsById.computeIfAbsent(((Number) row[0]).longValue(), k -> new ArrayList<>()).add(new Object[]{row[1], row[2]});
        }
        Map<Long, ClassReactionType> mineById = new HashMap<>();
        for (Object[] row : mine) mineById.put(((Number) row[0]).longValue(), (ClassReactionType) row[1]);
        Map<Long, Map<String, Object>> out = new HashMap<>();
        for (Long id : ids) out.put(id, summary(countsById.getOrDefault(id, List.of()), mineById.get(id)));
        return out;
    }

    /** rows of [reactionType, count] */
    private static Map<String, Object> summary(List<Object[]> rows, ClassReactionType mine) {
        Map<ClassReactionType, Long> byType = new EnumMap<>(ClassReactionType.class);
        for (Object[] row : rows) {
            byType.put((ClassReactionType) row[0], ((Number) row[1]).longValue());
        }
        List<Map<String, Object>> counts = new ArrayList<>();
        long total = 0;
        for (Map.Entry<ClassReactionType, Long> e : byType.entrySet()) {   // enum order = stable output
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("reaction_type", e.getKey().name());
            c.put("count", e.getValue());
            counts.add(c);
            total += e.getValue();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("viewer_reaction", mine == null ? null : mine.name());
        out.put("total_count", total);
        out.put("counts", counts);
        return out;
    }

    private static Map<String, Object> reactor(User u, ClassReactionType type, java.time.LocalDateTime at) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("user_id", u.getUuid());
        m.put("name", ClassJson.displayName(u));
        m.put("avatar_url", u.getAvatarUrl());
        m.put("reaction_type", type.name());
        m.put("reacted_at", ClassJson.at(at));
        return m;
    }
}
