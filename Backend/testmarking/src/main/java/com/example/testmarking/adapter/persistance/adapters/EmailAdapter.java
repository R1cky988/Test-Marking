package com.example.testmarking.adapter.persistance.adapters;

import com.example.testmarking.domain.ports.EmailPort;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailAdapter implements EmailPort {

    private final JavaMailSender mailSender;

    @Override
    public void sendVerificationEmail(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Mã xác thực tài khoản");
        message.setText("Mã xác thực của bạn là: " + code + "\nMã này có hiệu lực trong 5 phút.");
        mailSender.send(message);
    }

    @Override
    public void sendAccountEmail(String toEmail, String email, String password) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Tài khoản của bạn");
        message.setText("Tài khoản cho hệ thống TestMarking:\nEmail: " + email + "\nMật khẩu: " + password);
        mailSender.send(message);
    }
}
