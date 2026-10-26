package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.rest.dtos.response.PersonResponse;
import com.example.testmarking.domain.entities.User;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

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
    static PersonResponse person(User u) {
        return new PersonResponse(u.getUuid(), displayName(u), u.getAvatarUrl());
    }

    /** Change the order here if your users are shown "last first". */
    static String displayName(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last = u.getLastName() == null ? "" : u.getLastName().trim();
        String name = (last + " " + first).trim();
        return name.isEmpty() ? u.getEmail() : name;
    }
}
