package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.ClassRepository;
import com.example.testmarking.adapter.persistance.repository.ClassStudentRepository;
import com.example.testmarking.domain.entities.Class;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * One place that decides who may see / change a class. Every account has the same global role (USER); what a person
 * may do is decided PER CLASS:
 *  - TEACHER of the class = the user who created it (Class.createdUser): sees everything, approves join requests,
 *    pins / announces, removes members, moderates posts and comments
 *  - STUDENT of the class = a row in ClassStudent: reads, posts, comments, reacts and uploads files
 * The same person can be TEACHER in one class and STUDENT in another. Everybody else gets 403 (404 when the class
 * does not exist).
 */
@Component
public class ClassAccessImp {

    public static final String TEACHER = "TEACHER";
    public static final String STUDENT = "STUDENT";

    /** The class and what the current user is in it. */
    public record Access(Class cls, boolean owner) {
        public boolean student() { return !owner; }

        /** Role of the caller inside this class. */
        public String role() { return owner ? TEACHER : STUDENT; }
    }

    private final ClassRepository classes;
    private final ClassStudentRepository members;

    public ClassAccessImp(ClassRepository classes, ClassStudentRepository members) {
        this.classes = classes;
        this.members = members;
    }

    /** Teacher of the class or enrolled student. */
    public Access requireMember(User me, UUID classId) {
        Class cls = find(classId);
        return requireMember(me, cls);
    }

    public Access requireMember(User me, Class cls) {
        boolean owner = isOwner(me, cls);
        if (!owner && !members.existsByClassEntity_IdAndStudent_User_Id(cls.getId(), me.getId())) {
            throw TemplateException.forbidden("Bạn không thuộc lớp học này");
        }
        return new Access(cls, owner);
    }

    /** Only the teacher of this class (the user who created it). */
    public Access requireOwner(User me, UUID classId) {
        Class cls = find(classId);
        if (!isOwner(me, cls)) {
            throw TemplateException.forbidden("Chỉ giáo viên của lớp mới được thực hiện thao tác này");
        }
        return new Access(cls, true);
    }

    public Class find(UUID classId) {
        return classes.findByUuid(classId)
                .orElseThrow(() -> TemplateException.notFound("CLASS_NOT_FOUND", "Lớp học không tồn tại"));
    }

    static boolean isOwner(User me, Class cls) {
        return cls.getCreatedUser() != null && cls.getCreatedUser().getId().equals(me.getId());
    }
}
