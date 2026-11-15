package com.example.testmarking.common.component;

import com.example.testmarking.adapter.persistance.repository.StudentRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.regex.Pattern;

@Component
public class AccountCodeGenerator {

    /** A student code is "HS" + 8 digits (0-9, no letters): the same 8 digit columns the answer sheet reads. */
    public static final Pattern STUDENT_CODE = Pattern.compile("^HS[0-9]{8}$");

    private static final String CHARACTERS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private static final int CODE_LENGTH = 8;
    private static final int MAX_TRIES = 30;

    private final SecureRandom random = new SecureRandom();
    private final StudentRepository students;

    public AccountCodeGenerator(StudentRepository students) {
        this.students = students;
    }

    public static boolean isStudentCode(String code) {
        return code != null && STUDENT_CODE.matcher(code).matches();
    }

    /** HS + 8 random digits that no student has yet. */
    public String generateStudentCode() {
        for (int i = 0; i < MAX_TRIES; i++) {
            StringBuilder code = new StringBuilder("HS");
            for (int d = 0; d < CODE_LENGTH; d++) code.append((char) ('0' + random.nextInt(10)));
            String candidate = code.toString();
            if (!students.existsByStudentCode(candidate)) return candidate;
        }
        throw new IllegalStateException("Cannot find a free student code");
    }

    public String generateTeacherCode() {
        return generateCode("GV");
    }

    private String generateCode(String prefix) {
        StringBuilder code = new StringBuilder(prefix);

        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CHARACTERS.charAt(
                    random.nextInt(CHARACTERS.length())
            ));
        }

        return code.toString();
    }
}
