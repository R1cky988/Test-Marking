package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassDocumentRepository;
import com.example.testmarking.adapter.persistance.repository.ClassPostRepository;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.ClassDocument;
import com.example.testmarking.domain.entities.ClassPost;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.ClassPostStatus;
import com.example.testmarking.domain.ports.StoragePort;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Shared files of a class. A document with post == null shows only in the Files tab; one with a post is an attachment of
 * that post (and also listed in the Files tab). Only the teacher of the class uploads; members download.
 * Storage keys are generated (never the user's file name), downloads always go through this service.
 */
@Service
public class ClassDocumentImp {

    public static final long MAX_BYTES = 10L * 1024 * 1024;
    static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf",
            "png", "jpg", "jpeg", "gif", "webp", "zip", "rar", "7z");

    /** A file as the controller hands it over (no Spring type in here). */
    public record FileData(String name, String contentType, long size, InputStream stream) {}

    public record Download(InputStream stream, String fileName, String contentType, long size) {}

    private final ClassAccessImp access;
    private final ClassDocumentRepository documents;
    private final ClassPostRepository posts;
    private final StoragePort storage;
    private final String bucket;
    private final Set<String> readyBuckets = new HashSet<>();

    public ClassDocumentImp(ClassAccessImp access,
                            ClassDocumentRepository documents,
                            ClassPostRepository posts,
                            StoragePort storage,
                            @Value("${storage.buckets.class-files:class-files}") String bucket) {
        this.access = access;
        this.documents = documents;
        this.posts = posts;
        this.storage = storage;
        this.bucket = bucket;
    }

    // ─── list ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(User me, UUID classId) {
        Access a = access.requireMember(me, classId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ClassDocument d : documents.findByClass(a.cls().getId())) {
            if (d.getPost() != null && d.getPost().getStatus() == ClassPostStatus.DRAFT && !a.owner()) continue;
            out.add(item(d, a.owner() || d.getUploadedByUser().getId().equals(me.getId())));
        }
        return out;
    }

    // ─── upload ──────────────────────────────────────────────────

    /** postId = null for the Files tab, or the uuid of a post to attach the file to it. */
    @Transactional
    public Map<String, Object> upload(User me, UUID classId, UUID postId, String title, String description, FileData file) {
        Access a = access.requireOwner(me, classId);
        if (file == null || file.stream() == null || file.size() <= 0) {
            throw TemplateException.badRequest("Chưa chọn tệp", "file: is required");
        }
        if (file.size() > MAX_BYTES) {
            throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Tệp vượt quá 10MB", "max_bytes=" + MAX_BYTES);
        }
        String fileName = cleanName(file.name());
        String ext = extension(fileName);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw TemplateException.badRequestWithCode("FILE_TYPE_NOT_ALLOWED", "Loại tệp không được hỗ trợ",
                    "allowed=" + new TreeSet<>(ALLOWED_EXTENSIONS));
        }
        ClassPost post = null;
        if (postId != null) {
            post = posts.findByUuid(postId)
                    .filter(p -> p.getDeletedAt() == null && p.getClassEntity().getId().equals(a.cls().getId()))
                    .orElseThrow(() -> TemplateException.notFound("POST_NOT_FOUND", "Bài đăng không tồn tại"));
        }
        String cleanTitle = title == null || title.isBlank() ? fileName : title.trim();
        if (cleanTitle.length() > 255) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", "title: max 255 characters");
        }

        ClassDocument d = new ClassDocument();
        d.setUuid(UUID.randomUUID());
        d.setClassEntity(a.cls());
        d.setPost(post);
        d.setTitle(cleanTitle);
        d.setDescription(description == null || description.isBlank() ? null : description.trim());
        d.setFileName(fileName);
        d.setFileType(file.contentType() == null ? null : file.contentType());
        d.setFileSize(file.size());
        d.setUploadedByUser(me);
        d.setFilePath("class-documents/" + a.cls().getUuid() + "/" + d.getUuid() + "." + ext);

        ensureBucket();
        storage.uploadFile(bucket, d.getFilePath(), file.stream(), contentTypeOrDefault(file.contentType()), file.size());
        return item(documents.save(d), true);
    }

    // ─── download / delete ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Download download(User me, UUID classId, UUID documentId) {
        Access a = access.requireMember(me, classId);
        ClassDocument d = requireDocument(a, documentId);
        return new Download(storage.getFile(bucket, d.getFilePath()), d.getFileName(),
                contentTypeOrDefault(d.getFileType()), d.getFileSize() == null ? -1 : d.getFileSize());
    }

    /** The teacher of the class, or whoever uploaded the file. Soft delete: the object stays in storage. */
    @Transactional
    public void delete(User me, UUID classId, UUID documentId) {
        Access a = access.requireMember(me, classId);
        ClassDocument d = requireDocument(a, documentId);
        if (!a.owner() && !d.getUploadedByUser().getId().equals(me.getId())) {
            throw TemplateException.forbidden("Bạn không có quyền xóa tệp này");
        }
        d.setDeletedAt(LocalDateTime.now());
        documents.save(d);
    }

    // ─── helpers ─────────────────────────────────────────────────

    private ClassDocument requireDocument(Access a, UUID documentId) {
        ClassDocument d = documents.findByUuid(documentId)
                .filter(x -> x.getDeletedAt() == null && x.getClassEntity().getId().equals(a.cls().getId()))
                .orElseThrow(() -> TemplateException.notFound("DOCUMENT_NOT_FOUND", "Tệp không tồn tại"));
        if (d.getPost() != null && d.getPost().getStatus() == ClassPostStatus.DRAFT && !a.owner()) {
            throw TemplateException.notFound("DOCUMENT_NOT_FOUND", "Tệp không tồn tại");
        }
        return d;
    }

    private synchronized void ensureBucket() {
        if (readyBuckets.add(bucket)) {
            try {
                storage.ensureBucket(bucket);
            } catch (RuntimeException e) {
                readyBuckets.remove(bucket);
                throw e;
            }
        }
    }

    /** Document as JSON. canDelete = teacher or uploader. */
    static Map<String, Object> item(ClassDocument d, boolean canDelete) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getUuid());
        m.put("title", d.getTitle());
        m.put("description", d.getDescription());
        m.put("file_name", d.getFileName());
        m.put("file_type", d.getFileType());
        m.put("file_size", d.getFileSize());
        m.put("post_id", d.getPost() == null ? null : d.getPost().getUuid());
        m.put("uploaded_by", ClassJson.person(d.getUploadedByUser()));
        m.put("created_at", ClassJson.at(d.getCreatedAt()));
        m.put("can_delete", canDelete);
        return m;
    }

    static String cleanName(String raw) {
        String n = raw == null ? "" : raw.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (n.length() > 200) {
            String ext = extension(n);
            n = n.substring(0, 200 - (ext.isEmpty() ? 0 : ext.length() + 1)) + (ext.isEmpty() ? "" : "." + ext);
        }
        return n.isEmpty() ? "file" : n;
    }

    static String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 || dot == fileName.length() - 1 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String contentTypeOrDefault(String t) {
        return t == null || t.isBlank() ? "application/octet-stream" : t;
    }
}
