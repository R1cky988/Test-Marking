package com.example.testmarking.common.demo;

import com.example.testmarking.adapter.persistance.repository.*;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.*;
import com.example.testmarking.domain.entities.enums.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * DEMO ONLY (demo.enabled=true). Creates four users (all role USER), one class with posts, a comment, a pending join
 * request and three exams, so login / class list / class detail can be shown without SMTP or manual SQL.
 * Idempotent: does nothing when teacher@demo.vn already exists. Delete this file when you stop demoing.
 *
 *   teacher@demo.vn  / Demo12345  (teaches the class because he created it)
 *   student@demo.vn  / Demo12345  (student of the class)       class join code: DEMO01
 */
@Component
@ConditionalOnProperty(name = "demo.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    public static final String PASSWORD = "Demo12345";

    private final UserRepository users;
    private final StudentRepository students;
    private final ClassRepository classes;
    private final ClassStudentRepository members;
    private final ClassJoinRequestRepository requests;
    private final ClassPostRepository posts;
    private final ClassPostCommentRepository comments;
    private final ExaminationRepository exams;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (users.existsByEmail("teacher@demo.vn")) return;

        User teacher = user("teacher@demo.vn", "0900000001", "Lan", "Nguyễn Thị");
        User an = user("student@demo.vn", "0900000002", "An", "Trần Văn");
        User binh = user("binh@demo.vn", "0900000003", "Bình", "Lê Thị");
        User chi = user("chi@demo.vn", "0900000004", "Chi", "Phạm Minh");
        profile(teacher, "HS000");
        Student sAn = profile(an, "HS001"), sBinh = profile(binh, "HS002");
        profile(chi, "HS003");

        Class c = new Class();
        c.setCreatedUser(teacher);
        c.setName("Toán 10A1");
        c.setClassCode("10A1");
        c.setSubject("Toán");
        c.setDescription("Lớp demo");
        c.setClassJoinCode("DEMO01");
        c.setRequireJoinApproval(true);
        c.setIsArchived(false);
        classes.save(c);
        enroll(c, sAn);
        enroll(c, sBinh);
        requests.save(ClassJoinRequest.builder().clazz(c).student(chi).status(RequestStatus.PENDING).build());

        ClassPost welcome = ClassPost.builder().classEntity(c).author(teacher).type(ClassPostType.ANNOUNCEMENT)
                .title("Chào mừng cả lớp").content("Tuần này ôn tập chương 2. Các em xem tài liệu trong mục Tệp.")
                .status(ClassPostStatus.PUBLISHED).allowComments(true).isPinned(true).build();
        posts.save(welcome);
        ClassPost homework = ClassPost.builder().classEntity(c).author(teacher).type(ClassPostType.POST)
                .content("Bài tập về nhà: làm bài 1 đến 5 trang 40, nộp trước thứ sáu.")
                .status(ClassPostStatus.PUBLISHED).allowComments(true).isPinned(false).build();
        posts.save(homework);
        ClassPostComment question = ClassPostComment.builder().post(homework).author(an).content("Cô ơi bài 5 làm cả hai ý ạ?").build();
        comments.save(question);
        comments.save(ClassPostComment.builder().post(homework).author(teacher).parentComment(question).content("Đúng rồi em, làm cả hai ý.").build());

        OffsetDateTime now = OffsetDateTime.now();
        exam(teacher, c, "Kiểm tra 15 phút", ExamStatus.ONGOING, now.minusMinutes(10), now.plusMinutes(50), 15);
        exam(teacher, c, "Kiểm tra giữa kỳ", ExamStatus.UPCOMING, now.plusDays(3), now.plusDays(3).plusMinutes(45), 45);
        exam(teacher, c, "Kiểm tra chương 1", ExamStatus.COMPLETED, now.minusDays(7), now.minusDays(7).plusMinutes(45), 45);
    }

    private User user(String email, String phone, String first, String last) {
        return users.save(User.builder()
                .uuid(java.util.UUID.randomUUID()).email(email).phoneNumber(phone)
                .password(passwordEncoder.encode(PASSWORD))
                .firstName(first).lastName(last).avatarUrl("base_avatar")
                .role(Role.USER).status(UserStatus.ACTIVE).emailVerifiedAt(LocalDate.now()).build());
    }

    private Student profile(User u, String code) {
        Student s = new Student();
        s.setUser(u);
        s.setStudentCode(code);
        return students.save(s);
    }

    private void enroll(Class c, Student s) {
        ClassStudent cs = new ClassStudent();
        cs.setClassEntity(c);
        cs.setStudent(s);
        members.save(cs);
    }

    private void exam(User teacher, Class c, String name, ExamStatus status, OffsetDateTime from, OffsetDateTime to, int minutes) {
        Examination e = new Examination();    // no-arg constructor keeps the field defaults (NOT NULL columns)
        e.setCreatedUser(teacher);
        e.setClassEntity(c);
        e.setExamName(name);
        e.setSubjectName("Toán");
        e.setStatus(status);
        e.setFromTime(from);
        e.setToTime(to);
        e.setDurationMinutes(minutes);
        exams.save(e);
    }
}
