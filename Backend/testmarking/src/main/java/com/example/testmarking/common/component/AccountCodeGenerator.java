package com.example.testmarking.common.component;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class AccountCodeGenerator {

    private static final String CHARACTERS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private static final int CODE_LENGTH = 8;

    private final SecureRandom random = new SecureRandom();

    public String generateStudentCode() {
        return generateCode("HS");
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