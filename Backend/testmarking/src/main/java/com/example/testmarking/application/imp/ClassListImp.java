package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassRepository;
import com.example.testmarking.adapter.persistance.repository.ClassStudentRepository;
import com.example.testmarking.adapter.rest.dtos.request.CreateClassRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateClassRequest;
import com.example.testmarking.adapter.rest.dtos.response.ClassItemResponse;
import com.example.testmarking.adapter.rest.dtos.response.ClassListMeta;
import com.example.testmarking.adapter.rest.dtos.response.ClassListResponse;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * The class list page. Everybody sees "my classes": the ones he created (he is the TEACHER there) and the ones he
 * joined (he is a STUDENT there); each item says which one with my_role. Any user can create a class; only the
 * teacher of a class edits, archives and restores it ("delete" in the UI = archive, nothing is destroyed).
 */
@Service
@RequiredArgsConstructor
public class ClassListImp {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RANDOM = new SecureRandom();
    static final int MAX_LIMIT = 100;

    private final ClassRepository classes;
    private final ClassStudentRepository members;
    private final ClassAccessImp access;

    // ─── list ────────────────────────────────────────────────────

    /** @param status active | archived | all (default all). A class I only joined disappears from the list once it is archived. */
    @Transactional(readOnly = true)
    public ClassListResponse list(User me, String status, String search, Integer page, Integer limit) {
        int mode = archivedMode(status);
        int p = page == null || page < 1 ? 1 : page;
        int l = limit == null || limit < 1 ? 10 : Math.min(limit, MAX_LIMIT);
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        Page<Class> result = classes.findMine(me.getId(), mode, q, PageRequest.of(p - 1, l));

        Map<Long, Long> counts = new HashMap<>();
        List<Long> ids = result.getContent().stream().map(Class::getId).collect(Collectors.toList());
        if (!ids.isEmpty()) {
            for (Object[] row : members.countByClassIds(ids)) counts.put((Long) row[0], (Long) row[1]);
        }
        List<ClassItemResponse> data = new ArrayList<>();
        for (Class c : result.getContent()) {
            data.add(item(c, ClassAccessImp.isOwner(me, c), counts.getOrDefault(c.getId(), 0L)));
        }
        return new ClassListResponse(200, "OK", data, new ClassListMeta(p, l, result.getTotalElements()));
    }

    private static int archivedMode(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("all")) return 0;
        if (status.equalsIgnoreCase("active")) return 1;
        if (status.equalsIgnoreCase("archived")) return 2;
        throw TemplateException.badRequest("Dữ liệu không hợp lệ", "status: must be active, archived or all");
    }

    // ─── create / update / archive / restore ─────────────────────

    /** Any user can create a class; he becomes its teacher. */
    @Transactional
    public ClassItemResponse create(User me, CreateClassRequest body) {
        List<String> errors = new ArrayList<>();
        Class c = new Class();
        c.setCreatedUser(me);
        c.setName(text("class_name", body.className(), 200, true, errors));
        c.setSubject(text("subject", body.subject(), 100, false, errors));
        c.setDescription(text("description", body.description(), 5000, false, errors));
        String code = text("class_code", body.classCode(), 50, false, errors);
        c.setRequireJoinApproval(approval(body.requireJoinApproval(), body.approvalMode(), true, errors));
        fail(errors);

        c.setClassCode(code != null ? code : uniqueCode(classes::existsByClassCode));
        c.setClassJoinCode(uniqueCode(classes::existsByClassJoinCode));
        c.setIsArchived(false);
        classes.save(c);
        return item(c, true, 0L);
    }

    /** Partial update: only the fields that are present change. Teacher of the class only. */
    @Transactional
    public ClassItemResponse update(User me, UUID classId, UpdateClassRequest body) {
        Access a = access.requireOwner(me, classId);
        Class c = a.cls();
        if (Boolean.TRUE.equals(c.getIsArchived())) {
            throw TemplateException.badRequestWithCode("CLASS_ARCHIVED", "Lớp đã lưu trữ, hãy khôi phục trước khi chỉnh sửa");
        }
        // validate everything first, change the entity only when all of it is valid
        List<String> errors = new ArrayList<>();
        String name = body.className() != null ? text("class_name", body.className(), 200, true, errors) : c.getName();
        String subject = body.subject() != null ? text("subject", body.subject(), 100, false, errors) : c.getSubject();
        String description = body.description() != null ? text("description", body.description(), 5000, false, errors) : c.getDescription();
        String code = body.classCode() != null ? text("class_code", body.classCode(), 50, false, errors) : c.getClassCode();
        boolean approval = approval(body.requireJoinApproval(), body.approvalMode(), c.getRequireJoinApproval(), errors);
        fail(errors);

        c.setName(name);
        c.setSubject(subject);
        c.setDescription(description);
        c.setClassCode(code);
        c.setRequireJoinApproval(approval);
        classes.save(c);
        return item(c, true, members.countByClassEntity_Id(c.getId()));
    }

    /** "Delete" in the UI: hides the class (from its students too); posts, files and members stay. Idempotent. */
    @Transactional
    public ClassItemResponse archive(User me, UUID classId) {
        return setArchived(me, classId, true);
    }

    @Transactional
    public ClassItemResponse restore(User me, UUID classId) {
        return setArchived(me, classId, false);
    }

    private ClassItemResponse setArchived(User me, UUID classId, boolean archived) {
        Class c = access.requireOwner(me, classId).cls();
        if (!Boolean.valueOf(archived).equals(c.getIsArchived())) {
            c.setIsArchived(archived);
            classes.save(c);
        }
        return item(c, true, members.countByClassEntity_Id(c.getId()));
    }

    // ─── output ──────────────────────────────────────────────────

    private static ClassItemResponse item(Class c, boolean owner, long studentCount) {
        boolean approval = Boolean.TRUE.equals(c.getRequireJoinApproval());
        return new ClassItemResponse(
                c.getUuid(),
                c.getName(),
                c.getClassCode(),
                c.getSubject(),
                c.getDescription(),
                Boolean.TRUE.equals(c.getIsArchived()) ? "archived" : "active",
                approval ? "manual_approve" : "auto_approve",
                approval,
                studentCount,
                c.getCreatedUser().getUuid(),
                ClassJson.person(c.getCreatedUser()),
                owner ? ClassAccessImp.TEACHER : ClassAccessImp.STUDENT,
                owner,
                owner ? c.getClassJoinCode() : null,   // only the teacher sees the code that lets others in
                date(c.getCreatedAt()),
                date(c.getUpdatedAt()));
    }

    private static String date(LocalDate d) {
        return d == null ? null : d.toString();
    }

    // ─── helpers ─────────────────────────────────────────────────

    private static String uniqueCode(Predicate<String> exists) {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            if (!exists.test(sb.toString())) return sb.toString();
        }
        throw new IllegalStateException("Cannot generate a unique code");
    }

    /** require_join_approval wins; else approval_mode: manual_approve = teacher approves each request, auto_approve / no_approval = a valid code joins at once. */
    private static boolean approval(Boolean flag, String mode, Boolean fallback, List<String> errors) {
        if (flag != null) return flag;
        if (mode == null) return fallback == null || fallback;
        String v = mode.trim().toLowerCase(Locale.ROOT);
        if (v.equals("manual_approve")) return true;
        if (v.equals("auto_approve") || v.equals("no_approval")) return false;
        errors.add("approval_mode: must be manual_approve, auto_approve or no_approval");
        return fallback == null || fallback;
    }

    /** Trimmed text or null when absent / blank; collects an error when required or too long. */
    private static String text(String key, String raw, int max, boolean required, List<String> errors) {
        String v = raw == null ? "" : raw.trim();
        if (v.isEmpty()) {
            if (required) errors.add(key + ": must not be blank");
            return null;
        }
        if (v.length() > max) {
            errors.add(key + ": max " + max + " characters");
            return null;
        }
        return v;
    }

    private static void fail(List<String> errors) {
        if (!errors.isEmpty()) throw TemplateException.badRequest("Dữ liệu không hợp lệ", errors.toArray(new String[0]));
    }
}
