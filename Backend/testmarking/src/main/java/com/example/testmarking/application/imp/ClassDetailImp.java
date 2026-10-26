package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.adapter.rest.dtos.request.JoinClassRequest;
import com.example.testmarking.adapter.rest.dtos.request.RejectJoinRequest;
import com.example.testmarking.adapter.rest.dtos.response.*;
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
 * Entities in, DTOs (adapter/rest/dtos, snake_case JSON) out. What the caller may do is decided by his role IN THIS
 * CLASS (teacher = created it, student = joined it), never by a global role.
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
    private final StudentProfileImp studentProfiles;
    private final ClassJoinRequestRepository requests;
    private final ExaminationRepository exams;


    // ─── class info ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ClassDetailResponse detail(User me, UUID classId) {
        return detailOf(access.requireMember(me, classId));
    }

    private ClassDetailResponse detailOf(Access a) {
        Class c = a.cls();
        boolean teacher = a.owner();   // students must not see the code that lets others in
        return new ClassDetailResponse(
                c.getUuid(),
                c.getName(),
                c.getClassCode(),
                c.getSubject(),
                c.getDescription(),
                Boolean.TRUE.equals(c.getRequireJoinApproval()) ? "manual_approve" : "auto_approve",
                Boolean.TRUE.equals(c.getIsArchived()) ? "archived" : "active",
                members.countByClassEntity_Id(c.getId()),
                a.role(),
                teacher,
                ClassJson.person(c.getCreatedUser()),
                teacher ? c.getClassJoinCode() : null,
                teacher ? Boolean.TRUE.equals(c.getRequireJoinApproval()) : null,
                teacher ? requests.countByClazz_IdAndStatus(c.getId(), RequestStatus.PENDING) : null);
    }

    /** New random join code; the old one stops working. Teacher of the class only. */
    @Transactional
    public ClassDetailResponse regenerateJoinCode(User me, UUID classId) {
        Access a = access.requireOwner(me, classId);
        a.cls().setClassJoinCode(newJoinCode());
        classes.save(a.cls());
        return detailOf(a);
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
    public ClassMembersResponse members(User me, UUID classId) {
        Access a = access.requireMember(me, classId);
        User teacher = a.cls().getCreatedUser();
        PersonResponse t = ClassJson.person(teacher);
        MemberTeacherResponse teacherRow = new MemberTeacherResponse(t.id(), t.name(), t.avatarUrl(),
                ClassAccessImp.TEACHER, a.owner() ? teacher.getEmail() : null);

        List<MemberStudentResponse> list = new ArrayList<>();
        for (ClassStudent cs : members.findRoster(a.cls().getId())) {
            Student s = cs.getStudent();
            list.add(new MemberStudentResponse(
                    s.getUuid(),
                    ClassJson.displayName(s.getUser()),
                    s.getUser().getAvatarUrl(),
                    s.getStudentCode(),
                    cs.getJoinedAt(),
                    a.owner() ? s.getUser().getEmail() : null));   // contact details are for the teacher only
        }
        return new ClassMembersResponse(List.of(teacherRow), list, list.size());
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

    /** Any user (who is not the teacher of that class) enters a join code and becomes a STUDENT of it. Returns JOINED or PENDING (teacher must approve). */
    @Transactional
    public JoinClassResponse joinByCode(User me, JoinClassRequest body) {
        String code = body != null && body.joinCode() != null ? body.joinCode().trim().toUpperCase() : "";
        if (code.isEmpty()) {
            throw TemplateException.badRequest("Thiếu mã tham gia lớp", "join_code: must not be blank");
        }
        String message = body.message() != null && !body.message().isBlank() ? body.message().trim() : null;
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

        if (Boolean.FALSE.equals(cls.getRequireJoinApproval())) {
            enroll(cls, studentProfiles.ensure(me));
            return new JoinClassResponse(cls.getUuid(), cls.getName(), "JOINED");
        }
        requests.save(ClassJoinRequest.builder().clazz(cls).student(me).status(RequestStatus.PENDING).studentMessage(message).build());
        return new JoinClassResponse(cls.getUuid(), cls.getName(), "PENDING");
    }

    /** Teacher of the class only. status = PENDING (default), APPROVED or REJECTED. */
    @Transactional(readOnly = true)
    public List<JoinRequestResponse> joinRequests(User me, UUID classId, String status) {
        Access a = access.requireOwner(me, classId);
        RequestStatus wanted = parseStatus(status);
        List<ClassJoinRequest> rows = new ArrayList<>(requests.findByClassAndStatus(a.cls().getId(), wanted));
        if (wanted != RequestStatus.PENDING) Collections.reverse(rows);   // history: newest first

        Map<Long, Student> profiles = students.findByUser_IdIn(rows.stream().map(r -> r.getStudent().getId()).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(s -> s.getUser().getId(), s -> s, (x, y) -> x));
        List<JoinRequestResponse> out = new ArrayList<>();
        for (ClassJoinRequest r : rows) {
            PersonResponse who = ClassJson.person(r.getStudent());
            Student p = profiles.get(r.getStudent().getId());
            out.add(new JoinRequestResponse(
                    r.getUuid(),
                    new JoinRequestStudentResponse(who.id(), who.name(), who.avatarUrl(), r.getStudent().getEmail(),
                            p == null ? null : p.getStudentCode()),
                    r.getStudentMessage(),
                    r.getStatus().name(),
                    r.getRejectionReason(),
                    ClassJson.at(r.getCreatedAt()),
                    ClassJson.at(r.getProcessedAt())));
        }
        return out;
    }

    /** Approve = mark the request APPROVED and make the user a student of the class, in one transaction. */
    @Transactional
    public JoinDecisionResponse approve(User me, UUID classId, UUID requestId) {
        Access a = access.requireOwner(me, classId);
        ClassJoinRequest r = requirePending(a.cls(), requestId);
        Student profile = studentProfiles.ensure(r.getStudent());
        if (!members.existsByClassEntity_IdAndStudent_Id(a.cls().getId(), profile.getId())) {
            enroll(a.cls(), profile);
        }
        close(r, RequestStatus.APPROVED, me, null);
        return new JoinDecisionResponse(r.getUuid(), "APPROVED");
    }

    @Transactional
    public JoinDecisionResponse reject(User me, UUID classId, UUID requestId, RejectJoinRequest body) {
        Access a = access.requireOwner(me, classId);
        ClassJoinRequest r = requirePending(a.cls(), requestId);
        String reason = body != null && body.reason() != null && !body.reason().isBlank() ? body.reason().trim() : null;
        if (reason != null && reason.length() > 500) {
            throw TemplateException.badRequest("Dữ liệu không hợp lệ", "reason: max 500 characters");
        }
        close(r, RequestStatus.REJECTED, me, reason);
        return new JoinDecisionResponse(r.getUuid(), "REJECTED");
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
    public ClassExamsResponse exams(User me, UUID classId) {
        return exams(me, classId, OffsetDateTime.now());
    }

    ClassExamsResponse exams(User me, UUID classId, OffsetDateTime now) {
        Access a = access.requireMember(me, classId);
        Map<String, List<ExamItemResponse>> groups = new LinkedHashMap<>();
        for (String g : List.of("upcoming", "ongoing", "ended", "draft")) groups.put(g, new ArrayList<>());

        for (Examination e : exams.findByClassEntity_IdOrderByFromTimeDesc(a.cls().getId())) {
            String bucket = bucket(e, now);
            if (bucket.equals("draft") && !a.owner()) continue;   // students never see drafts
            groups.get(bucket).add(examItem(e, bucket, a.owner()));
        }
        // soonest first for what is coming, newest first for what is over
        groups.get("upcoming").sort(Comparator.comparing(ExamItemResponse::fromTime,
                Comparator.nullsLast(Comparator.naturalOrder())));

        return new ClassExamsResponse(groups.get("upcoming"), groups.get("ongoing"), groups.get("ended"),
                a.owner() ? groups.get("draft") : null);
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

    private static ExamItemResponse examItem(Examination e, String bucket, boolean owner) {
        return new ExamItemResponse(
                e.getUuid(),
                e.getExamName(),
                e.getSubjectName(),
                e.getStatus().name(),
                bucket,
                e.getFormat() == null ? null : e.getFormat().name(),
                e.getFromTime(),
                e.getToTime(),
                e.getDurationMinutes(),
                owner ? Boolean.TRUE.equals(e.getIsScorePublished()) : null);
    }
}
