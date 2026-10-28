package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassStudentRepository;
import com.example.testmarking.adapter.persistance.repository.StudentRepository;
import com.example.testmarking.adapter.persistance.repository.UserRepository;
import com.example.testmarking.common.component.AccountCodeGenerator;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.ClassStudent;
import com.example.testmarking.domain.entities.Student;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.Role;
import com.example.testmarking.domain.entities.enums.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One account of the Excel import, in ONE transaction: user + student profile + membership of the class.
 * Separate bean so that @Transactional really applies (the import itself must not be one big transaction: each row stands alone).
 */
@Service
public class ImportedAccountImp {

    private final UserRepository users;
    private final StudentRepository students;
    private final ClassStudentRepository members;
    private final AccountCodeGenerator codes;

    public ImportedAccountImp(UserRepository users, StudentRepository students, ClassStudentRepository members, AccountCodeGenerator codes) {
        this.users = users;
        this.students = students;
        this.members = members;
        this.codes = codes;
    }

    /** The account is ACTIVE at once: the e-mail with the password is the proof of the address. */
    @Transactional
    public User create(Class cls, String email, String firstName, String lastName, String encodedPassword) {
        UUID id = UUID.randomUUID();
        User user = users.save(User.builder()
                .uuid(id)
                .email(email)
                // phone_number is NOT NULL + unique in the schema and the sheet has none: a unique placeholder until the user sets his own
                .phoneNumber("IMP-" + id.toString().replace("-", "").substring(0, 16))
                .password(encodedPassword)
                .firstName(firstName)
                .lastName(lastName)
                .avatarUrl("base_avatar")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .emailVerifiedAt(LocalDate.now())
                .build());
        Student student = students.save(Student.builder()
                .uuid(UUID.randomUUID())
                .user(user)
                .studentCode(codes.generateStudentCode())
                .build());
        ClassStudent cs = new ClassStudent();
        cs.setClassEntity(cls);
        cs.setStudent(student);
        members.save(cs);
        return user;
    }

    /**
     * Existing account: keep it as it is, only put it into the class (idempotent).
     * @return true when added now, false when already a member or when it is the class teacher himself.
     */
    @Transactional
    public boolean addExisting(Class cls, User user) {
        if (cls.getCreatedUser() != null && user.getId().equals(cls.getCreatedUser().getId())) return false;
        Student student = students.findByUser_Id(user.getId()).orElseGet(() -> students.save(Student.builder()
                .uuid(UUID.randomUUID())
                .user(user)
                .studentCode(codes.generateStudentCode())
                .build()));
        if (members.existsByClassEntity_IdAndStudent_Id(cls.getId(), student.getId())) return false;
        ClassStudent cs = new ClassStudent();
        cs.setClassEntity(cls);
        cs.setStudent(student);
        members.save(cs);
        return true;
    }

    /** Undo create(): used when the e-mail with the password could not be sent (the user would never learn it). */
    @Transactional
    public void remove(Long userId) {
        students.findByUser_Id(userId).ifPresent(s -> {
            members.deleteByStudent_Id(s.getId());
            students.delete(s);
        });
        users.deleteById(userId);
    }
}
