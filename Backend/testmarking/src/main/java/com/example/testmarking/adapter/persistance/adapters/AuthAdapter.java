package com.example.testmarking.adapter.persistance.adapters;

import com.example.testmarking.adapter.persistance.repository.PasswordResetCodeRepository;
import com.example.testmarking.adapter.persistance.repository.StudentRepository;
import com.example.testmarking.adapter.persistance.repository.UserRepository;
import com.example.testmarking.adapter.persistance.repository.VerificationCodeRepository;
import com.example.testmarking.adapter.persistance.security.JwtService;
import com.example.testmarking.adapter.rest.dtos.request.LoginRequest;
import com.example.testmarking.adapter.rest.dtos.request.RegisterRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePasswordRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateUserRequest;
import com.example.testmarking.adapter.rest.dtos.response.AuthResponse;
import com.example.testmarking.adapter.rest.dtos.response.UserResponse;
import com.example.testmarking.common.component.AccountCodeGenerator;
import com.example.testmarking.domain.entities.PasswordResetCode;
import com.example.testmarking.domain.entities.Student;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.VerificationCode;
import com.example.testmarking.domain.entities.enums.Role;
import com.example.testmarking.domain.entities.enums.UserStatus;
import com.example.testmarking.domain.ports.UserPort;
import com.example.testmarking.template.exception.TemplateException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthAdapter implements UserPort {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final VerificationCodeRepository verificationCodeRepository;
    private final StudentRepository studentRepository;
    private final AccountCodeGenerator accountCodeGenerator;
    private final EmailAdapter emailService;
    private final JwtService jwtService;
    private final PasswordResetCodeRepository passwordResetCodeRepository;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int RESET_CODE_MINUTES = 5;
    private static final int RESET_TOKEN_MINUTES = 10;
    private static final int RESET_RESEND_SECONDS = 60;
    private static final int RESET_MAX_ATTEMPTS = 5;

    @Override
    public AuthResponse login(LoginRequest request) {

        String email = request.getEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email/Password không đúng"));

        if(user.getStatus() == UserStatus.PENDING){
            throw TemplateException.badRequestWithCode("UNVERIFIED_ACCOUNT", "Tài khoản chưa được xác nhận");
        }
        if(user.getStatus() == UserStatus.SUSPENSE){
            throw TemplateException.badRequestWithCode("SUSPENDED_ACCOUNT", "Tài khoản đã bị cấm");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public void register(RegisterRequest request) {
        String email = request.getEmail();
        if(userRepository.existsByEmail(email)){
            throw new RuntimeException("Email đã được sử dụng");
        }
        if(userRepository.existsByPhoneNumber(request.getPhoneNumber())){
            throw  new RuntimeException("Số điện thoại này đã được sử dụng");
        }

        String password = request.getPassword();

        if (request.getFirstName() == null || request.getFirstName().isBlank()
                || request.getLastName() == null || request.getLastName().isBlank()) {
            throw new RuntimeException("Họ và tên không được để trống");
        }
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Mật khẩu phải có ít nhất 8 ký tự");
        }
        // Everybody registers as USER. Teacher / student is decided per class: whoever creates a class teaches it,
        // whoever joins one is its student.

        String BASE_AVATAR = "base_avatar";
        User user = User.builder()
                .uuid(UUID.randomUUID())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(password))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .gender(request.getGender())
                .status(UserStatus.PENDING)
                .avatarUrl(BASE_AVATAR)
                .role(Role.USER)
                .build();

        userRepository.save(user);
        // ClassStudent points at a Student row, so every account gets one: it is what lets the user join classes.
        Student student = Student.builder()
                .uuid(user.getUuid())
                .user(user)
                .studentCode(accountCodeGenerator.generateStudentCode())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
        studentRepository.save(student);
        sendVerificationCode(user);
    }

    private void sendVerificationCode(User user) {
        String code = String.valueOf((int) ((Math.random() * 900000) + 100000));

        VerificationCode verificationCode = VerificationCode.builder()
                .code(code)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .build();

        verificationCodeRepository.save(verificationCode);
        emailService.sendVerificationEmail(user.getEmail(), code);
    }

    @Override
    public void resendVerificationCode(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Thiếu email");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        if (user.getEmailVerifiedAt() != null) {
            throw new RuntimeException("Email đã được xác thực");
        }
        sendVerificationCode(user);
    }

    @Override
    @Transactional
    public AuthResponse updateProfile(UpdateUserRequest request) {
        User currentUser = getCurrentUser();

        if (request.getEmail() != null && !currentUser.getEmail().equals(request.getEmail())) {

            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email đã được sử dụng");
            }

            currentUser.setEmail(request.getEmail());
        }

        if (request.getPhoneNumber() != null && !currentUser.getPhoneNumber().equals(request.getPhoneNumber())) {

            if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
                throw new RuntimeException("Số điện thoại này đã được sử dụng");
            }

            currentUser.setPhoneNumber(request.getPhoneNumber());
        }

        currentUser.setFirstName(request.getFirstName() != null ? request.getFirstName() : currentUser.getFirstName());
        currentUser.setLastName(request.getLastName() != null ? request.getLastName() : currentUser.getLastName());
        userRepository.save(currentUser);

        var accessToken = jwtService.generateAccessToken(currentUser);
        var refreshToken = jwtService.generateRefreshToken(currentUser);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("Thiếu refresh token");
        }
        try {
            String email = jwtService.extractUsernameFromRefreshToken(refreshToken);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User không tồn tại"));
            if (!jwtService.isRefreshTokenValid(refreshToken, user.getEmail())) {
                throw new RuntimeException("Refresh token không hợp lệ");
            }
            return AuthResponse.builder()
                    .accessToken(jwtService.generateAccessToken(user))
                    .refreshToken(jwtService.generateRefreshToken(user))
                    .build();
        } catch (io.jsonwebtoken.JwtException e) {
            throw new RuntimeException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
    }

    @Override
    @Transactional
    public void updatePassword(UpdatePasswordRequest request) {
        User user = getCurrentUser();
        if(!passwordEncoder.matches(request.getOldPassword(), user.getPassword())){
            throw new RuntimeException("Wrong password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public UserResponse getCurrentUserToResponse() {
        User user = getCurrentUser();

        return UserResponse.builder()
                .uuid(user.getUuid())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .dob(user.getDob())
                .gender(user.getGender())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public User getCurrentUser() {
        String email = Objects.requireNonNull(SecurityContextHolder
                        .getContext()
                        .getAuthentication())
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    @Transactional
    public AuthResponse verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        VerificationCode verificationCode = verificationCodeRepository.findByCodeAndUser(code, user)
                .orElseThrow(() -> new RuntimeException("Mã xác thực không đúng"));

        if (verificationCode.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã xác thực đã hết hạn");
        }

        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(LocalDate.now());
        userRepository.save(user);

        verificationCodeRepository.delete(verificationCode);

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }
    @Override
    @Transactional
    public void requestPasswordReset(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Vui lòng nhập email");
        }
        User user = userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new RuntimeException("Email chưa được đăng ký trong hệ thống"));
        if (user.getStatus() == UserStatus.SUSPENSE) {
            throw new RuntimeException("Tài khoản đã bị cấm");
        }

        var last = passwordResetCodeRepository.findFirstByUserOrderByCreatedAtDesc(user);
        if (last.isPresent()) {
            long waited = Duration.between(last.get().getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (waited < RESET_RESEND_SECONDS) {
                throw new RuntimeException("Vui lòng đợi " + (RESET_RESEND_SECONDS - waited) + " giây rồi gửi lại mã");
            }
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        // a new request replaces the old one, so only the newest code works
        passwordResetCodeRepository.deleteByUser(user);
        passwordResetCodeRepository.flush();
        LocalDateTime now = LocalDateTime.now();
        passwordResetCodeRepository.save(PasswordResetCode.builder()
                .user(user)
                .code(code)
                .attempts(0)
                .createdAt(now)
                .expiryDate(now.plusMinutes(RESET_CODE_MINUTES))
                .build());
        emailService.sendPasswordResetEmail(user.getEmail(), code);
    }

    @Override
    @Transactional
    public String verifyPasswordResetCode(String email, String code) {
        User user = findUserByEmail(email);
        PasswordResetCode request = passwordResetCodeRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new RuntimeException("Bạn chưa yêu cầu đặt lại mật khẩu"));

        if (request.getResetToken() != null || request.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetCodeRepository.delete(request);
            throw new RuntimeException("Mã đã hết hạn, vui lòng gửi lại mã mới");
        }
        if (code == null || !request.getCode().equals(code.trim())) {
            request.setAttempts(request.getAttempts() + 1);
            if (request.getAttempts() >= RESET_MAX_ATTEMPTS) {
                passwordResetCodeRepository.delete(request);
                throw new RuntimeException("Nhập sai quá nhiều lần, vui lòng gửi lại mã mới");
            }
            passwordResetCodeRepository.save(request);
            throw new RuntimeException("Mã xác nhận không đúng");
        }

        String token = java.util.UUID.randomUUID().toString().replace("-", "")
                + java.util.UUID.randomUUID().toString().replace("-", "");
        request.setResetToken(token);
        request.setExpiryDate(LocalDateTime.now().plusMinutes(RESET_TOKEN_MINUTES));
        passwordResetCodeRepository.save(request);
        return token;
    }

    @Override
    @Transactional
    public void resetPassword(String email, String resetToken, String newPassword) {
        User user = findUserByEmail(email);
        PasswordResetCode request = passwordResetCodeRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new RuntimeException("Phiên đặt lại mật khẩu không hợp lệ"));

        if (request.getResetToken() == null || resetToken == null || !request.getResetToken().equals(resetToken)) {
            throw new RuntimeException("Phiên đặt lại mật khẩu không hợp lệ");
        }
        if (request.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetCodeRepository.delete(request);
            throw new RuntimeException("Phiên đặt lại mật khẩu đã hết hạn, vui lòng làm lại");
        }
        if (newPassword == null || newPassword.length() < 8
                || !newPassword.matches(".*[A-Za-z].*") || !newPassword.matches(".*[0-9].*")) {
            throw new RuntimeException("Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        passwordResetCodeRepository.deleteByUser(user);
    }

    private User findUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Thiếu email");
        }
        return userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new RuntimeException("Email chưa được đăng ký trong hệ thống"));
    }
}
