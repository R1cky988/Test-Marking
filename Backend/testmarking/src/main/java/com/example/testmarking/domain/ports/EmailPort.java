package com.example.testmarking.domain.ports;

public interface EmailPort {
    void sendVerificationEmail(String toEmail, String code);
}
