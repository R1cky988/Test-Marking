package com.example.testmarking.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One pending "forgot password" request. Step 1 stores the 6-digit {@code code}; once the user types it correctly
 * {@code resetToken} is filled in and the code can no longer be used. The token is what lets the user set a new password.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "password_reset_codes")
public class PasswordResetCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(name = "code", nullable = false)
    private String code;

    /** Wrong codes typed so far; the request is dropped after too many. */
    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** When the code stops working (or, after verification, when the reset token stops working). */
    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;
}
