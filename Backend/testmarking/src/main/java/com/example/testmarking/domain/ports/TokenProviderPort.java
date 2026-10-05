package com.example.testmarking.domain.ports;

import com.example.testmarking.domain.entities.User;

public interface TokenProviderPort {
    String generateAccessToken(User user);
    String generateRefreshToken(User user);
    String extractUsername(String token);
    boolean isTokenValid(String token, String username);
}
