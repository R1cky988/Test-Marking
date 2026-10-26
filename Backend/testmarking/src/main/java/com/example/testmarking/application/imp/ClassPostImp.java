package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassDocumentRepository;
import com.example.testmarking.adapter.persistance.repository.ClassPostCommentRepository;
import com.example.testmarking.adapter.persistance.repository.ClassPostRepository;
import com.example.testmarking.adapter.rest.dtos.request.CommentRequest;
import com.example.testmarking.adapter.rest.dtos.request.CreatePostRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePostRequest;
import com.example.testmarking.adapter.rest.dtos.response.CommentResponse;
import com.example.testmarking.adapter.rest.dtos.response.DocumentResponse;
import com.example.testmarking.adapter.rest.dtos.response.PostResponse;
import com.example.testmarking.adapter.rest.dtos.response.ReactionSummaryResponse;
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
 * The stream of a class: posts, comments and replies. Rights are per class:
 *  - every member (teacher or student of THIS class) writes posts, comments and reacts; people edit only their own posts
 *    and comments and can delete their own
 *  - a student writes normal posts only (type POST, published, not pinned)
 *  - the teacher of the class also writes announcements, pins / closes posts, deletes any post and hides or deletes any comment
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
    public List<PostResponse> feed(User me, UUID classId) {
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

        Map<Long, ReactionSummaryResponse> postReactions = reactions.postSummaries(postIds, me.getId());
        Map<Long, ReactionSummaryResponse> commentReactions = reactions.commentSummaries(
                visible.stream().map(ClassPostComment::getId).toList(), me.getId());

        List<PostResponse> out = new ArrayList<>();
        for (ClassPost p : rows) {
            List<DocumentResponse> files = new ArrayList<>();
            for (ClassDocument d : docsByPost.getOrDefault(p.getId(), List.of())) {
                files.add(ClassDocumentImp.item(d, a.owner() || d.getUploadedByUser().getId().equals(me.getId())));
            }
            List<CommentResponse> cs = new ArrayList<>();
            for (ClassPostComment c : commentsByPost.getOrDefault(p.getId(), List.of())) {
                cs.add(commentItem(c, me, a.owner(), commentReactions.get(c.getId())));
            }
            long visibleCount = cs.stream().filter(c -> !c.isHidden()).count();
            out.add(postItem(p, me, a.owner(), files, cs, visibleCount, postReactions.get(p.getId())));
        }
        return out;
    }

    // ─── posts ───────────────────────────────────────────────────

    /** Any member writes a post. A student is limited to a normal, published, unpinned post. */
    @Transactional
    public PostResponse createPost(User me, UUID classId, CreatePostRequest body) {
        Access a = access.requireMember(me, classId);
        List<String> errors = new ArrayList<>();
        String content = text("content", body.content(), MAX_POST, true, errors);
        String title = text("title", body.title(), MAX_TITLE, false, errors);
        ClassPostType type = enumOf("type", body.type(), ClassPostType.class, ClassPostType.POST, errors);
        ClassPostStatus status = enumOf("status", body.status(), ClassPostStatus.class, ClassPostStatus.PUBLISHED, errors);
        boolean allowComments = body.allowComments() == null || body.allowComments();
        boolean pinned = Boolean.TRUE.equals(body.isPinned());
        fail(errors);
        if (!a.owner() && (type != ClassPostType.POST || status != ClassPostStatus.PUBLISHED || pinned)) {
            throw TemplateException.forbidden("Học sinh chỉ được đăng bài thường (không phải thông báo, không ghim, không lưu nháp)");
        }

        ClassPost p = ClassPost.builder().classEntity(a.cls()).author(me).type(type).title(title).content(content)
                .status(status).allowComments(allowComments).isPinned(pinned).build();
        posts.save(p);
        return postItem(p, me, a.owner(), List.of(), List.of(), 0, reactions.postSummary(p.getId(), me.getId()));
    }

    /**
     * Author: title, content, type (students: POST only), comments on/off. Teacher of the class: also status (close / reopen)
     * and pin on any post, but never the words of somebody else.
     */
    @Transactional
    public PostResponse updatePost(User me, UUID classId, UUID postId, UpdatePostRequest body) {
        Access a = access.requireMember(me, classId);
        ClassPost p = requirePost(a, postId);
        boolean author = isAuthor(p, me);
        boolean touchesWords = body.content() != null || body.title() != null || body.type() != null;
        if (touchesWords && !author) throw TemplateException.forbidden("Bạn chỉ có thể sửa bài đăng của mình");
        if ((body.status() != null || body.isPinned() != null) && !a.owner()) {
            throw TemplateException.forbidden("Chỉ giáo viên của lớp mới được ghim hoặc đổi trạng thái bài đăng");
        }
        if (body.allowComments() != null && !author && !a.owner()) {
            throw TemplateException.forbidden("Bạn không có quyền sửa bài đăng này");
        }

        List<String> errors = new ArrayList<>();
        if (body.content() != null) p.setContent(text("content", body.content(), MAX_POST, true, errors));
        if (body.title() != null) p.setTitle(text("title", body.title(), MAX_TITLE, false, errors));
        if (body.type() != null) {
            ClassPostType next = enumOf("type", body.type(), ClassPostType.class, p.getType(), errors);
            if (!a.owner() && next != ClassPostType.POST) throw TemplateException.forbidden("Học sinh chỉ được đăng bài thường");
            p.setType(next);
        }
        if (body.status() != null) {
            ClassPostStatus next = enumOf("status", body.status(), ClassPostStatus.class, p.getStatus(), errors);
            if (next == ClassPostStatus.PUBLISHED && p.getPublishedAt() == null) p.setPublishedAt(LocalDateTime.now());
            p.setStatus(next);
        }
        if (body.allowComments() != null) p.setAllowComments(body.allowComments());
        if (body.isPinned() != null) p.setIsPinned(body.isPinned());
        fail(errors);
        posts.save(p);
        return postItem(p, me, a.owner(), null, null, null, null);
    }

    /** Soft delete by the author or by the teacher of the class. Its comments and files disappear from the stream with it. */
    @Transactional
    public void deletePost(User me, UUID classId, UUID postId) {
        Access a = access.requireMember(me, classId);
        ClassPost p = requirePost(a, postId);
        if (!a.owner() && !isAuthor(p, me)) {
            throw TemplateException.forbidden("Bạn không có quyền xóa bài đăng này");
        }
        p.setDeletedAt(LocalDateTime.now());
        posts.save(p);
    }

    // ─── comments ────────────────────────────────────────────────

    /** body: content, and parent_comment_id (uuid, optional) to reply. */
    @Transactional
    public CommentResponse addComment(User me, UUID classId, UUID postId, CommentRequest body) {
        Access a = access.requireMember(me, classId);
        ClassPost p = requirePost(a, postId);
        if (p.getStatus() != ClassPostStatus.PUBLISHED || !Boolean.TRUE.equals(p.getAllowComments())) {
            throw TemplateException.badRequestWithCode("COMMENTS_DISABLED", "Bài đăng này không cho phép bình luận");
        }
        List<String> errors = new ArrayList<>();
        String content = text("content", body.content(), MAX_COMMENT, true, errors);
        fail(errors);

        ClassPostComment parent = null;
        if (body.parentCommentId() != null && !body.parentCommentId().isBlank()) {
            UUID parentId = uuid(body.parentCommentId());
            ClassPostComment found = comments.findByUuid(parentId)
                    .filter(c -> c.getDeletedAt() == null && !Boolean.TRUE.equals(c.getIsHidden()) && c.getPost().getId().equals(p.getId()))
                    .orElseThrow(() -> TemplateException.notFound("COMMENT_NOT_FOUND", "Bình luận không tồn tại"));
            parent = found.getParentComment() != null ? found.getParentComment() : found;   // replies are one level deep
        }
        ClassPostComment c = ClassPostComment.builder().post(p).author(me).parentComment(parent).content(content).build();
        comments.save(c);
        return commentItem(c, me, a.owner(), reactions.commentSummary(c.getId(), me.getId()));
    }

    /** Only the author edits a comment. */
    @Transactional
    public CommentResponse updateComment(User me, UUID classId, UUID commentId, CommentRequest body) {
        Access a = access.requireMember(me, classId);
        ClassPostComment c = requireComment(a, commentId);
        if (!c.getAuthor().getId().equals(me.getId())) {
            throw TemplateException.forbidden("Bạn chỉ có thể sửa bình luận của mình");
        }
        List<String> errors = new ArrayList<>();
        c.setContent(text("content", body.content(), MAX_COMMENT, true, errors));
        fail(errors);
        comments.save(c);
        return commentItem(c, me, a.owner(), null);
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
    public CommentResponse setCommentHidden(User me, UUID classId, UUID commentId, boolean hidden) {
        Access a = access.requireOwner(me, classId);
        ClassPostComment c = requireComment(a, commentId);
        c.setIsHidden(hidden);
        c.setHiddenByUser(hidden ? me : null);
        c.setHiddenAt(hidden ? LocalDateTime.now() : null);
        comments.save(c);
        return commentItem(c, me, true, null);
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

    private static boolean isAuthor(ClassPost p, User me) {
        return p.getAuthor().getId().equals(me.getId());
    }

    /** attachments / comments / commentCount / reactions are null when the endpoint does not load them (they are then left out of the JSON). */
    private static PostResponse postItem(ClassPost p, User me, boolean owner, List<DocumentResponse> attachments,
                                         List<CommentResponse> comments, Number commentCount, ReactionSummaryResponse reactions) {
        boolean author = isAuthor(p, me);
        return new PostResponse(
                p.getUuid(),
                p.getType().name(),
                p.getStatus().name(),
                p.getTitle(),
                p.getContent(),
                Boolean.TRUE.equals(p.getAllowComments()),
                Boolean.TRUE.equals(p.getIsPinned()),
                ClassJson.person(p.getAuthor()),
                ClassJson.at(p.getPublishedAt()),
                ClassJson.at(p.getCreatedAt()),
                ClassJson.at(p.getUpdatedAt()),
                author,
                author || owner,
                owner,
                attachments,
                comments,
                commentCount == null ? null : commentCount.longValue(),
                reactions);
    }

    private static CommentResponse commentItem(ClassPostComment c, User me, boolean owner, ReactionSummaryResponse reactions) {
        boolean mine = c.getAuthor().getId().equals(me.getId());
        return new CommentResponse(
                c.getUuid(),
                c.getParentComment() == null ? null : c.getParentComment().getUuid(),
                ClassJson.person(c.getAuthor()),
                c.getContent(),
                Boolean.TRUE.equals(c.getIsHidden()),
                ClassJson.at(c.getCreatedAt()),
                ClassJson.at(c.getUpdatedAt()),
                mine,
                mine || owner,
                owner,
                reactions);
    }

    // field parsing

    private static String text(String key, String raw, int max, boolean required, List<String> errors) {
        if (raw == null || raw.isBlank()) {
            if (required) errors.add(key + ": must not be blank");
            return null;
        }
        String v = raw.strip();
        if (v.length() > max) {
            errors.add(key + ": max " + max + " characters");
            return null;
        }
        return v;
    }

    private static <E extends Enum<E>> E enumOf(String key, String raw, java.lang.Class<E> type, E fallback, List<String> errors) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return Enum.valueOf(type, raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            errors.add(key + ": must be one of " + Arrays.toString(type.getEnumConstants()));
            return fallback;
        }
    }

    private static UUID uuid(String raw) {
        try {
            return UUID.fromString(raw.trim());
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
