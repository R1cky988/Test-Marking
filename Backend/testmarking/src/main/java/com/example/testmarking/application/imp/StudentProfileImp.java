package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.StudentRepository;
import com.example.testmarking.common.component.AccountCodeGenerator;
import com.example.testmarking.domain.entities.Student;
import com.example.testmarking.domain.entities.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * ClassStudent points at a Student row, so a user needs one before he can join a class. Everybody who registers gets it
 * (see AuthAdapter); accounts created before that (or by hand) get it the first time they join a class.
 */
@Service
public class StudentProfileImp {

    private final StudentRepository students;
    private final AccountCodeGenerator codes;

    public StudentProfileImp(StudentRepository students, AccountCodeGenerator codes) {
        this.students = students;
        this.codes = codes;
    }

    @Transactional
    public Student ensure(User user) {
        return students.findByUser_Id(user.getId()).orElseGet(() -> students.save(Student.builder()
                .uuid(UUID.randomUUID())
                .user(user)
                .studentCode(codes.generateStudentCode())
                .build()));
    }
}
