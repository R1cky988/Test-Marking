package com.example.testmarking.domain.entities.enums;

/**
 * How an exam is taken:
 *  OFFLINE - paper exam, the teacher marks it, the result is published later
 *  ONLINE  - taken on the phone; the teacher may choose to show the result right after submitting (default: yes)
 *  SUBMIT  - the student writes on paper and photographs the sheet with the app; the result is never shown at once
 */
public enum ExamFormat {
    OFFLINE, ONLINE, SUBMIT
}
