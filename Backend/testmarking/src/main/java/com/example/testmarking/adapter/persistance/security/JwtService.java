package com.example.testmarking.adapter.persistance.security;

import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.ports.TokenProviderPort;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService implements TokenProviderPort {

    @Value("${application.security.jwt.access-token.secret-key}")
    private String accessTokenSecretKey;

    @Value("${application.security.jwt.access-token.expiration}")
    private long accessTokenExpiration;

    @Value("${application.security.jwt.refresh-token.secret-key}")
    private String refreshTokenSecretKey;

    @Value("${application.security.jwt.refresh-token.expiration}")
    private long refreshTokenExpiration;

    @Override
    public String generateAccessToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        // Embed user role into access token claims for RBAC
        if (user.getRole() != null) {
            extraClaims.put("role", user.getRole().name());
        }
        return buildToken(extraClaims, user.getEmail(), accessTokenExpiration, getAccessTokenKey());
    }

    @Override
    public String generateRefreshToken(User user) {
        // Refresh token only needs the subject identity
        return buildToken(new HashMap<>(), user.getEmail(), refreshTokenExpiration, getRefreshTokenKey());
    }

    @Override
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject, getAccessTokenKey());
    }

    public String extractUsernameFromRefreshToken(String token) {
        return extractClaim(token, Claims::getSubject, getRefreshTokenKey());
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class), getAccessTokenKey());
    }

    @Override
    public boolean isTokenValid(String token, String username) {
        final String extractedUser = extractUsername(token);
        return (extractedUser.equals(username)) && !isTokenExpired(token, getAccessTokenKey());
    }

    public boolean isRefreshTokenValid(String token, String username) {
        final String extractedUser = extractUsernameFromRefreshToken(token);
        return (extractedUser.equals(username)) && !isTokenExpired(token, getRefreshTokenKey());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver, SecretKey key) {
        final Claims claims = extractAllClaims(token, key);
        return claimsResolver.apply(claims);
    }

    private String buildToken(Map<String, Object> extraClaims, String subject, long expiration, SecretKey key) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    private boolean isTokenExpired(String token, SecretKey key) {
        return extractClaim(token, Claims::getExpiration, key).before(new Date());
    }

    private Claims extractAllClaims(String token, SecretKey key) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getAccessTokenKey() {
        byte[] keyBytes = Decoders.BASE64.decode(accessTokenSecretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private SecretKey getRefreshTokenKey() {
        byte[] keyBytes = Decoders.BASE64.decode(refreshTokenSecretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}