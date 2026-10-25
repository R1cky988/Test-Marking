package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassDocumentRepository;
import com.example.testmarking.adapter.persistance.repository.ClassPostCommentRepository;
import com.example.testmarking.adapter.persistance.repository.ClassPostRepository;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.ClassDocument;
import com.example.testmarking.domain.entities.ClassPost;
import com.example.testmarking.domain.entities.ClassPostComment;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.ClassPostStatus;
import com.example.testmarking.domain.entities.enums.ClassPostType;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * The stream of a class: posts, comments and replies.
 *  - the teacher of the class writes / edits / pins / deletes posts and can hide or delete any comment
 *  - students (and the teacher) comment and react; people edit or delete only their own comments
 * Post and comment text is plain text (the client must not render it as HTML).
 */
@Service
@RequiredArgsConstructor
public class ClassPostImp {

    static final int MAX_TITLE = 200;
    static final int MAX_POST = 10_000;
    static final int MAX_COMMENT = 5_000;

    private final ClassAccessImp access;
    private final ClassPostRepository posts;
    private final ClassPostCommentRepository comments;
    private final ClassDocumentRepository documents;
    private final ClassReactionImp reactions;

    // ─── stream ──────────────────────────────────────────────────

    /** Posts with their attachments, comments (flat, replies point to parent_id) and reaction summaries. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> feed(User me, UUID classId) {
        Access a = access.requireMember(me, classId);
        List<ClassPost> rows = posts.findFeed(a.cls().getId(), a.owner());
        if (rows.isEmpty()) return List.of();

        List<Long> postIds = rows.stream().map(ClassPost::getId).toList();
        Map<Long, List<ClassDocument>> docsByPost = new HashMap<>();
        for (ClassDocument d : documents.findByPostIds(postIds)) {
            docsByPost.computeIfAbsent(d.getPost().getId(), k -> new ArrayList<>()).add(d);
        }
        List<ClassPostComment> allComments = comments.findByPostIds(postIds).stream()
                .filter(c -> a.owner() || !Boolean.TRUE.equals(c.getIsHidden()))   // students do not see hidden comments
                .toList();
        Set<Long> liveIds = allComments.stream().map(ClassPostComment::getId).collect(Collectors.toSet());
        // a reply whose parent was deleted or hidden would hang in the air: drop it
        List<ClassPostComment> visible = allComments.stream()
                .filter(c -> c.getParentComment() == null || liveIds.contains(c.getParentComment().getId())).toList();
        Map<Long, List<ClassPostComment>> commentsByPost = new HashMap<>();
        for (ClassPostComment c : visible) commentsByPost.computeIfAbsent(c.getPost().getId(), k -> new ArrayList<>()).add(c);

        Map<Long, Map<String, Object>> postReactions = reactions.postSummaries(postIds, me.getId());
        Map<Long, Map<String, Object>> commentReactions = reactions.commentSummaries(
                visible.stream().map(ClassPostComment::getId).toList(), me.getId());

        List<Map<String, Object>> out = new ArrayList<>();
        for (ClassPost p : rows) {
            Map<String, Object> m = postItem(p, a.owner());
            List<Map<String, Object>> files = new ArrayList<>();
            for (ClassDocument d : docsByPost.getOrDefault(p.getId(), List.of())) {
                files.add(ClassDocumentImp.item(d, a.owner() || d.getUploadedByUser().getId().equals(me.getId())));
            }
            m.put("attachments", files);
            List<Map<String, Object>> cs = new ArrayList<>();
            for (ClassPostComment c : commentsByPost.getOrDefault(p.getId(), List.of())) {
                Map<String, Object> ci = commentItem(c, me, a.owner());
                ci.put("reactions", commentReactions.get(c.getId()));
                cs.add(ci);
            }
            m.put("comments", cs);
            m.put("comment_count", cs.stream().filter(c -> !Boolean.TRUE.equals(c.get("is_hidden"))).count());
            m.put("reactions", postReactions.get(p.getId()));
            out.add(m);
        }
        return out;
    }

    // ─── posts (teacher) ─────────────────────────────────────────

    @Transactional
    public Map<String, Object> createPost(User me, UUID classId, Map<String, Object> body) {
        Access a = access.requireOwner(me, classId);
        List<String> errors = new ArrayList<>();
        String content = text(body, "content", MAX_POST, true, errors);
        String title = text(body, "title", MAX_TITLE, false, errors);
        ClassPostType type = enumOf(body, "type", ClassPostType.class, ClassPostType.POST, errors);
        ClassPostStatus status = enumOf(body, "status", ClassPostStatus.class, ClassPostStatus.PUBLISHED, errors);
        Boolean allowComments = flag(body, "allow_comments", true, errors);
        Boolean pinned = flag(body, "is_pinned", false, errors);
        fail(errors);

        ClassPost p = ClassPost.builder().classEntity(a.cls()).author(me).type(type).title(title).content(content)
                .status(status).allowComments(allowComments).isPinned(pinned).build();
        posts.save(p);
        Map<String, Object> m = postItem(p, true);
        m.put("attachments", List.of());
        m.put("comments", List.of());
        m.put("comment_count", 0);
        m.put("reactions", reactions.postSummary(p.getId(), me.getId()));
        return m;
    }

    @Transactional
    public Map<String, Object> updatePost(User me, UUID classId, UUID postId, Map<String, Object> body) {
        Access a = access.requireOwner(me, classId);
        ClassPost p = requirePost(a, postId);
        List<String> errors = new ArrayList<>();
        if (body.containsKey("content")) p.setContent(text(body, "content", MAX_POST, true, errors));
        if (body.containsKey("title")) p.setTitle(text(body, "title", MAX_TITLE, false, errors));
        if (body.containsKey("type")) p.setType(enumOf(body, "type", ClassPostType.class, p.getType(), errors));
        if (body.containsKey("status")) {
            ClassPostStatus next = enumOf(body, "status", ClassPostStatus.class, p.getStatus(), errors);
            if (next == ClassPostStatus.PUBLISHED && p.getPublishedAt() == null) p.setPublishedAt(LocalDateTime.now());
            p.setStatus(next);
        }
        if (body.containsKey("allow_comments")) p.setAllowComments(flag(body, "allow_comments", p.getAllowComments(), errors));
        if (body.containsKey("is_pinned")) p.setIsPinned(flag(body, "is_pinned", p.getIsPinned(), errors));
        fail(errors);
        posts.save(p);
        return postItem(p, true);
    }

    /** Soft delete. Its comments and files disappear from the stream with it. */
    @Transactional
    public void deletePost(User me, UUID classId, UUID postId) {
        Access a = access.requireOwner(me, classId);
        ClassPost p = requirePost(a, postId);
        p.setDeletedAt(LocalDateTime.now());
        posts.save(p);
    }

    // ─── comments ────────────────────────────────────────────────

    /** body: { "content": "...", "parent_comment_id": "<uuid>" (optional, to reply) }. */
    @Transactional
    public Map<String, Object> addComment(User me, UUID classId, UUID postId, Map<String, Object> body) {
        Access a = access.requireMember(me, classId);
        ClassPost p = requirePost(a, postId);
        if (p.getStatus() != ClassPostStatus.PUBLISHED || !Boolean.TRUE.equals(p.getAllowComments())) {
            throw TemplateException.badRequestWithCode("COMMENTS_DISABLED", "Bài đăng này không cho phép bình luận");
        }
        List<String> errors = new ArrayList<>();
        String content = text(body, "content", MAX_COMMENT, true, errors);
        fail(errors);

        ClassPostComment parent = null;
        if (body.get("parent_comment_id") != null) {
            UUID parentId = uuid(body.get("parent_comment_id"));
            ClassPostComment found = comments.findByUuid(parentId)
                    .filter(c -> c.getDeletedAt() == null && !Boolean.TRUE.equals(c.getIsHidden()) && c.getPost().getId().equals(p.getId()))
                    .orElseThrow(() -> TemplateException.notFound("COMMENT_NOT_FOUND", "Bình luận không tồn tại"));
            parent = found.getParentComment() != null ? found.getParentComment() : found;   // replies are one level deep
        }
        ClassPostComment c = ClassPostComment.builder().post(p).author(me).parentComment(parent).content(content).build();
        comments.save(c);
        Map<String, Object> m = commentItem(c, me, a.owner());
        m.put("reactions", reactions.commentSummary(c.getId(), me.getId()));
        return m;
    }

    /** Only the author edits a comment. */
    @Transactional
    public Map<String, Object> updateComment(User me, UUID classId, UUID commentId, Map<String, Object> body) {
        Access a = access.requireMember(me, classId);
        ClassPostComment c = requireComment(a, commentId);
        if (!c.getAuthor().getId().equals(me.getId())) {
            throw TemplateException.forbidden("Bạn chỉ có thể sửa bình luận của mình");
        }
        List<String> errors = new ArrayList<>();
        c.setContent(text(body, "content", MAX_COMMENT, true, errors));
        fail(errors);
        comments.save(c);
        return commentItem(c, me, a.owner());
    }

    /** The author or the teacher of the class. */
    @Transactional
    public void deleteComment(User me, UUID classId, UUID commentId) {
        Access a = access.requireMember(me, classId);
        ClassPostComment c = requireComment(a, commentId);
        if (!a.owner() && !c.getAuthor().getId().equals(me.getId())) {
            throw TemplateException.forbidden("Bạn không có quyền xóa bình luận này");
        }
        c.setDeletedAt(LocalDateTime.now());
        comments.save(c);
    }

    /** Teacher hides (or shows again) a comment. Students stop seeing it, the author does not get a notice. */
    @Transactional
    public Map<String, Object> setCommentHidden(User me, UUID classId, UUID commentId, boolean hidden) {
        Access a = access.requireOwner(me, classId);
        ClassPostComment c = requireComment(a, commentId);
        c.setIsHidden(hidden);
        c.setHiddenByUser(hidden ? me : null);
        c.setHiddenAt(hidden ? LocalDateTime.now() : null);
        comments.save(c);
        return commentItem(c, me, true);
    }

    // ─── helpers ─────────────────────────────────────────────────

    private ClassPost requirePost(Access a, UUID postId) {
        return posts.findByUuid(postId)
                .filter(p -> p.getDeletedAt() == null && p.getClassEntity().getId().equals(a.cls().getId())
                        && (a.owner() || p.getStatus() != ClassPostStatus.DRAFT))
                .orElseThrow(() -> TemplateException.notFound("POST_NOT_FOUND", "Bài đăng không tồn tại"));
    }

    private ClassPostComment requireComment(Access a, UUID commentId) {
        return comments.findByUuid(commentId)
                .filter(c -> c.getDeletedAt() == null && c.getPost().getDeletedAt() == null
                        && c.getPost().getClassEntity().getId().equals(a.cls().getId())
                        && (a.owner() || (!Boolean.TRUE.equals(c.getIsHidden()) && c.getPost().getStatus() != ClassPostStatus.DRAFT)))
                .orElseThrow(() -> TemplateException.notFound("COMMENT_NOT_FOUND", "Bình luận không tồn tại"));
    }

    private static Map<String, Object> postItem(ClassPost p, boolean owner) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getUuid());
        m.put("type", p.getType().name());
        m.put("status", p.getStatus().name());
        m.put("title", p.getTitle());
        m.put("content", p.getContent());
        m.put("allow_comments", Boolean.TRUE.equals(p.getAllowComments()));
        m.put("is_pinned", Boolean.TRUE.equals(p.getIsPinned()));
        m.put("author", ClassJson.person(p.getAuthor()));
        m.put("published_at", ClassJson.at(p.getPublishedAt()));
        m.put("created_at", ClassJson.at(p.getCreatedAt()));
        m.put("updated_at", ClassJson.at(p.getUpdatedAt()));
        m.put("can_edit", owner);   // only the teacher of the class writes posts
        return m;
    }

    private static Map<String, Object> commentItem(ClassPostComment c, User me, boolean owner) {
        boolean mine = c.getAuthor().getId().equals(me.getId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getUuid());
        m.put("parent_id", c.getParentComment() == null ? null : c.getParentComment().getUuid());
        m.put("author", ClassJson.person(c.getAuthor()));
        m.put("content", c.getContent());
        m.put("is_hidden", Boolean.TRUE.equals(c.getIsHidden()));
        m.put("created_at", ClassJson.at(c.getCreatedAt()));
        m.put("updated_at", ClassJson.at(c.getUpdatedAt()));
        m.put("can_edit", mine);
        m.put("can_delete", mine || owner);
        m.put("can_hide", owner);
        return m;
    }

    // body parsing

    private static String text(Map<String, Object> body, String key, int max, boolean required, List<String> errors) {
        Object raw = body == null ? null : body.get(key);
        if (raw == null || (raw instanceof String s0 && s0.isBlank())) {
            if (required) errors.add(key + ": must not be blank");
            return null;
        }
        if (!(raw instanceof String s)) {
            errors.add(key + ": must be a string");
            return null;
        }
        String v = s.strip();
        if (v.length() > max) {
            errors.add(key + ": max " + max + " characters");
            return null;
        }
        return v;
    }

    private static <E extends Enum<E>> E enumOf(Map<String, Object> body, String key, java.lang.Class<E> type, E fallback, List<String> errors) {
        Object raw = body.get(key);
        if (raw == null) return fallback;
        if (raw instanceof String s) {
            try {
                return Enum.valueOf(type, s.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // fall through
            }
        }
        errors.add(key + ": must be one of " + Arrays.toString(type.getEnumConstants()));
        return fallback;
    }

    private static Boolean flag(Map<String, Object> body, String key, Boolean fallback, List<String> errors) {
        Object raw = body.get(key);
        if (raw == null) return fallback;
        if (raw instanceof Boolean b) return b;
        errors.add(key + ": must be true or false");
        return fallback;
    }

    private static UUID uuid(Object raw) {
        try {
            return UUID.fromString(String.valueOf(raw));
        } catch (IllegalArgumentException e) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", "parent_comment_id: not a uuid");
        }
    }

    private static void fail(List<String> errors) {
        if (!errors.isEmpty()) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
        }
    }
}
