package com.example.testmarking.application.imp;

import com.example.testmarking.domain.entities.User;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

/** Small helpers so every class-detail endpoint writes users and dates the same way. */
final class ClassJson {

    private ClassJson() {}

    /**
     * The entities store LocalDateTime (server clock, no zone). Send it with its offset, otherwise a browser in another
     * time zone shows the wrong time.
     */
    static OffsetDateTime at(LocalDateTime t) {
        return t == null ? null : t.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    /** Public view of a user: never the email, phone or numeric id. */
    static Map<String, Object> person(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getUuid());
        m.put("name", displayName(u));
        m.put("avatar_url", u.getAvatarUrl());
        return m;
    }

    /** Change the order here if your users are shown "last first". */
    static String displayName(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last = u.getLastName() == null ? "" : u.getLastName().trim();
        String name = (first + " " + last).trim();
        return name.isEmpty() ? u.getEmail() : name;
    }
}
