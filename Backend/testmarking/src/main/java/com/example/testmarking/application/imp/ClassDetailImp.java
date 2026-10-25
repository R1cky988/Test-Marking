package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.enums.ExamStatus;
import com.example.testmarking.domain.entities.enums.RequestStatus;
import com.example.testmarking.template.exception.TemplateException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Everything the class detail page needs besides the stream and the files:
 * class info + join code, members, join requests (student asks, teacher approves/rejects), exams by status.
 * Entities in, Maps (snake_case) out.
 */
@Service
@RequiredArgsConstructor
public class ClassDetailImp {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClassAccessImp access;
    private final ClassRepository classes;
    private final ClassStudentRepository members;
    private final StudentRepository students;
    private final ClassJoinRequestRepository requests;
    private final ExaminationRepository exams;


    // ─── class info ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> detail(User me, UUID classId) {
        return detailMap(access.requireMember(me, classId));
    }

    private Map<String, Object> detailMap(Access a) {
        Class c = a.cls();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getUuid());
        m.put("class_name", c.getName());
        m.put("class_code", c.getClassCode());
        m.put("subject", c.getSubject());
        m.put("description", c.getDescription());
        m.put("status", Boolean.TRUE.equals(c.getIsArchived()) ? "archived" : "active");
        m.put("student_count", members.countByClassEntity_Id(c.getId()));
        m.put("my_role", a.owner() ? "TEACHER" : "STUDENT");
        m.put("is_teacher", a.owner());
        m.put("teacher", ClassJson.person(c.getCreatedUser()));
        if (a.owner()) {   // students must not see the code that lets others in
            m.put("join_code", c.getClassJoinCode());
            m.put("require_join_approval", Boolean.TRUE.equals(c.getRequireJoinApproval()));
            m.put("pending_request_count", requests.countByClazz_IdAndStatus(c.getId(), RequestStatus.PENDING));
        }
        return m;
    }

    /** New random join code; the old one stops working. */
    @Transactional
    public Map<String, Object> regenerateJoinCode(User me, UUID classId) {
        Access a = access.requireOwner(me, classId);
        a.cls().setClassJoinCode(newJoinCode());
        classes.save(a.cls());
        return detailMap(a);
    }

    private String newJoinCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            if (!classes.existsByClassJoinCode(sb.toString())) return sb.toString();
        }
        throw new IllegalStateException("Cannot generate a unique join code");
    }

    // ─── members ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> members(User me, UUID classId) {
        Access a = access.requireMember(me, classId);
        User teacher = a.cls().getCreatedUser();
        Map<String, Object> t = new LinkedHashMap<>(ClassJson.person(teacher));
        t.put("role", "TEACHER");
        if (a.owner()) t.put("email", teacher.getEmail());

        List<Map<String, Object>> list = new ArrayList<>();
        for (ClassStudent cs : members.findRoster(a.cls().getId())) {
            Student s = cs.getStudent();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getUuid());
            m.put("name", ClassJson.displayName(s.getUser()));
            m.put("avatar_url", s.getUser().getAvatarUrl());
            m.put("student_code", s.getStudentCode());
            m.put("joined_at", cs.getJoinedAt());
            if (a.owner()) m.put("email", s.getUser().getEmail());   // contact details are for the teacher only
            list.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("teachers", List.of(t));
        out.put("students", list);
        out.put("student_count", list.size());
        return out;
    }

    /** Teacher removes a student from the class. The student can ask to join again. */
    @Transactional
    public void removeStudent(User me, UUID classId, UUID studentId) {
        Access a = access.requireOwner(me, classId);
        ClassStudent cs = members.findByClassAndStudentUuid(a.cls().getId(), studentId)
                .orElseThrow(() -> TemplateException.notFound("MEMBER_NOT_FOUND", "Học sinh không có trong lớp"));
        members.delete(cs);
    }

    // ─── join requests ───────────────────────────────────────────

    /** Student enters a join code. Returns JOINED (class has no approval) or PENDING (teacher must approve). */
    @Transactional
    public Map<String, Object> joinByCode(User me, Map<String, Object> body) {
        String code = body != null && body.get("join_code") instanceof String s ? s.trim().toUpperCase() : "";
        if (code.isEmpty()) {
            throw TemplateException.badRequest("Thiếu mã tham gia lớp", "join_code: must not be blank");
        }
        String message = body.get("message") instanceof String s && !s.isBlank() ? s.trim() : null;
        if (message != null && message.length() > 500) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", "message: max 500 characters");
        }
        Class cls = classes.findByJoinCode(code)
                .orElseThrow(() -> TemplateException.notFound("JOIN_CODE_INVALID", "Mã tham gia không đúng"));
        if (Boolean.TRUE.equals(cls.getIsArchived())) {
            throw TemplateException.badRequestWithCode("CLASS_ARCHIVED", "Lớp học đã được lưu trữ");
        }
        if (ClassAccessImp.isOwner(me, cls)) {
            throw TemplateException.badRequestWithCode("OWN_CLASS", "Bạn là giáo viên của lớp này");
        }
        if (members.existsByClassEntity_IdAndStudent_User_Id(cls.getId(), me.getId())) {
            throw TemplateException.badRequestWithCode("ALREADY_MEMBER", "Bạn đã ở trong lớp này");
        }
        if (requests.existsByClazz_IdAndStudent_IdAndStatus(cls.getId(), me.getId(), RequestStatus.PENDING)) {
            throw TemplateException.badRequestWithCode("REQUEST_PENDING", "Bạn đã gửi yêu cầu, vui lòng chờ giáo viên duyệt");
        }
        Student profile = students.findByUser_Id(me.getId())
                .orElseThrow(() -> TemplateException.badRequestWithCode("STUDENT_PROFILE_MISSING", "Tài khoản chưa có hồ sơ học sinh"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("class_id", cls.getUuid());
        out.put("class_name", cls.getName());
        if (Boolean.FALSE.equals(cls.getRequireJoinApproval())) {
            enroll(cls, profile);
            out.put("status", "JOINED");
        } else {
            requests.save(ClassJoinRequest.builder().clazz(cls).student(me).status(RequestStatus.PENDING).studentMessage(message).build());
            out.put("status", "PENDING");
        }
        return out;
    }

    /** status = PENDING (default), APPROVED or REJECTED. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> joinRequests(User me, UUID classId, String status) {
        Access a = access.requireOwner(me, classId);
        RequestStatus wanted = parseStatus(status);
        List<ClassJoinRequest> rows = new ArrayList<>(requests.findByClassAndStatus(a.cls().getId(), wanted));
        if (wanted != RequestStatus.PENDING) Collections.reverse(rows);   // history: newest first

        Map<Long, Student> profiles = students.findByUser_IdIn(rows.stream().map(r -> r.getStudent().getId()).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(s -> s.getUser().getId(), s -> s, (x, y) -> x));
        List<Map<String, Object>> out = new ArrayList<>();
        for (ClassJoinRequest r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getUuid());
            Map<String, Object> st = new LinkedHashMap<>(ClassJson.person(r.getStudent()));
            st.put("email", r.getStudent().getEmail());
            Student p = profiles.get(r.getStudent().getId());
            st.put("student_code", p == null ? null : p.getStudentCode());
            m.put("student", st);
            m.put("message", r.getStudentMessage());
            m.put("status", r.getStatus().name());
            m.put("rejection_reason", r.getRejectionReason());
            m.put("created_at", ClassJson.at(r.getCreatedAt()));
            m.put("processed_at", ClassJson.at(r.getProcessedAt()));
            out.add(m);
        }
        return out;
    }

    /** Approve = mark the request APPROVED and put the student in the class, in one transaction. */
    @Transactional
    public Map<String, Object> approve(User me, UUID classId, UUID requestId) {
        Access a = access.requireOwner(me, classId);
        ClassJoinRequest r = requirePending(a.cls(), requestId);
        Student profile = students.findByUser_Id(r.getStudent().getId())
                .orElseThrow(() -> TemplateException.badRequestWithCode("STUDENT_PROFILE_MISSING", "Tài khoản này chưa có hồ sơ học sinh"));
        if (!members.existsByClassEntity_IdAndStudent_Id(a.cls().getId(), profile.getId())) {
            enroll(a.cls(), profile);
        }
        close(r, RequestStatus.APPROVED, me, null);
        return Map.of("id", r.getUuid(), "status", "APPROVED");
    }

    @Transactional
    public Map<String, Object> reject(User me, UUID classId, UUID requestId, Map<String, Object> body) {
        Access a = access.requireOwner(me, classId);
        ClassJoinRequest r = requirePending(a.cls(), requestId);
        String reason = body != null && body.get("reason") instanceof String s && !s.isBlank() ? s.trim() : null;
        if (reason != null && reason.length() > 500) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", "reason: max 500 characters");
        }
        close(r, RequestStatus.REJECTED, me, reason);
        return Map.of("id", r.getUuid(), "status", "REJECTED");
    }

    private ClassJoinRequest requirePending(Class cls, UUID requestId) {
        ClassJoinRequest r = requests.findByUuid(requestId)
                .filter(x -> x.getClazz().getId().equals(cls.getId()))
                .orElseThrow(() -> TemplateException.notFound("REQUEST_NOT_FOUND", "Yêu cầu tham gia không tồn tại"));
        if (r.getStatus() != RequestStatus.PENDING) {
            throw TemplateException.badRequestWithCode("REQUEST_NOT_PENDING", "Yêu cầu này đã được xử lý");
        }
        return r;
    }

    private void close(ClassJoinRequest r, RequestStatus status, User by, String reason) {
        r.setStatus(status);
        r.setProcessedByUser(by);
        r.setProcessedAt(LocalDateTime.now());
        r.setRejectionReason(reason);
        requests.save(r);
    }

    private void enroll(Class cls, Student student) {
        ClassStudent cs = new ClassStudent();
        cs.setClassEntity(cls);
        cs.setStudent(student);
        members.save(cs);
    }

    private static RequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return RequestStatus.PENDING;
        try {
            RequestStatus s = RequestStatus.valueOf(status.trim().toUpperCase());
            if (s == RequestStatus.CANCELED) throw new IllegalArgumentException();
            return s;
        } catch (IllegalArgumentException e) {
            throw TemplateException.badRequest("status không hợp lệ", "status must be PENDING, APPROVED or REJECTED");
        }
    }

    // ─── exams of the class ──────────────────────────────────────

    /**
     * Exams grouped for the tabs: upcoming / ongoing / ended (and draft, teachers only).
     * The time window decides; the stored status is used when there is no window, and COMPLETED / CANCELLED always mean ended.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exams(User me, UUID classId) {
        return exams(me, classId, OffsetDateTime.now());
    }

    Map<String, Object> exams(User me, UUID classId, OffsetDateTime now) {
        Access a = access.requireMember(me, classId);
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        for (String g : List.of("upcoming", "ongoing", "ended", "draft")) groups.put(g, new ArrayList<>());

        for (Examination e : exams.findByClassEntity_IdOrderByFromTimeDesc(a.cls().getId())) {
            String bucket = bucket(e, now);
            if (bucket.equals("draft") && !a.owner()) continue;   // students never see drafts
            groups.get(bucket).add(examItem(e, bucket, a.owner()));
        }
        // soonest first for what is coming, newest first for what is over
        groups.get("upcoming").sort(Comparator.comparing((Map<String, Object> m) -> (OffsetDateTime) m.get("from_time"),
                Comparator.nullsLast(Comparator.naturalOrder())));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("upcoming", groups.get("upcoming"));
        out.put("ongoing", groups.get("ongoing"));
        out.put("ended", groups.get("ended"));
        if (a.owner()) out.put("draft", groups.get("draft"));
        return out;
    }

    static String bucket(Examination e, OffsetDateTime now) {
        ExamStatus st = e.getStatus();
        if (st == ExamStatus.DRAFT) return "draft";
        if (st == ExamStatus.CANCELLED || st == ExamStatus.COMPLETED) return "ended";
        OffsetDateTime from = e.getFromTime(), to = e.getToTime();
        if (from != null && now.isBefore(from)) return "upcoming";
        if (to != null && now.isAfter(to)) return "ended";
        if (from != null) return "ongoing";
        return st == ExamStatus.ONGOING ? "ongoing" : "upcoming";
    }

    private static Map<String, Object> examItem(Examination e, String bucket, boolean owner) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getUuid());
        m.put("name", e.getExamName());
        m.put("subject", e.getSubjectName());
        m.put("status", e.getStatus().name());
        m.put("bucket", bucket);
        m.put("format", e.getFormat() == null ? null : e.getFormat().name());
        m.put("from_time", e.getFromTime());
        m.put("to_time", e.getToTime());
        m.put("duration_minutes", e.getDurationMinutes());
        if (owner) m.put("is_score_published", Boolean.TRUE.equals(e.getIsScorePublished()));
        return m;
    }
}
