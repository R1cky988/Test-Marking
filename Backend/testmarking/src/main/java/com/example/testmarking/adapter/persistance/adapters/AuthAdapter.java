package com.example.testmarking.adapter.persistance.adapters;

import com.example.testmarking.adapter.persistance.repository.UserRepository;
import com.example.testmarking.adapter.persistance.security.JwtService;
import com.example.testmarking.adapter.rest.dtos.request.LoginRequest;
import com.example.testmarking.adapter.rest.dtos.request.RegisterRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdatePasswordRequest;
import com.example.testmarking.adapter.rest.dtos.request.UpdateUserRequest;
import com.example.testmarking.adapter.rest.dtos.response.AuthResponse;
import com.example.testmarking.adapter.rest.dtos.response.UserResponse;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.entities.enums.Role;
import com.example.testmarking.domain.ports.UserPort;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthAdapter implements UserPort {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Override
    public AuthResponse login(LoginRequest request) {

        String email = request.getEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email/Password không đúng"));

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
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail();
        if(userRepository.existsByEmail(email)){
            throw new RuntimeException("Email đã được sử dụng");
        }
        if(userRepository.existsByPhoneNumber(request.getPhoneNumber())){
            throw  new RuntimeException("Số điện thoại này đã được sử dụng");
        }

        String password = request.getPassword();

        Role userRole = request.getRole();

        String BASE_AVATAR = "base_avatar";
        User user = User.builder()
                .uuid(UUID.randomUUID())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(password)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .gender(request.getGender())
                .avatarUrl(BASE_AVATAR)
                .role(userRole)
                .build();

        userRepository.save(user);

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
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
}
