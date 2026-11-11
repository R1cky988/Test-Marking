package com.example.testmarking.application.imp;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * The rules of an ONLINE exam taken on the phone, kept free of Spring and the database so they can be tested alone.
 *
 *  - time per question (exam without open book): the working time is shared out by difficulty, easy : medium : hard = 1 : 2 : 3
 *  - the student's deadline: his start plus the working time, never later than the end of the exam
 *  - leaving the exam screen: ignored with open book; otherwise "FLAG" = he may go on but the paper is flagged as a violation
 *    (0 points, the teacher can undo it), "LOCK" = the exam is locked until the teacher unlocks it
 */
final class OnlineExamRules {
    private OnlineExamRules() {}

    static final String POLICY_FLAG = "FLAG";
    static final String POLICY_LOCK = "LOCK";

    /** Weights easy / medium / hard: an easy question gets 1 share of time, a medium one 2, a hard one 3. */
    static final int[] WEIGHT = {1, 2, 3};
    /** No question gets less than this (seconds) as long as the working time allows it. */
    static final int MIN_SECONDS = 10;

    // ─── time per question ───────────────────────────────────────

    /** The seconds of one question, from its difficulty name (EASY, MEDIUM, HARD); unknown counts as medium. */
    static int weightOf(String difficulty) {
        if (difficulty == null) return WEIGHT[1];
        return switch (difficulty.toUpperCase(Locale.ROOT)) {
            case "EASY" -> WEIGHT[0];
            case "HARD" -> WEIGHT[2];
            default -> WEIGHT[1];
        };
    }

    /**
     * Shares {@code totalSeconds} among the questions by weight. The result always adds up to exactly totalSeconds; every
     * question gets at least MIN_SECONDS when that is possible.
     */
    static int[] allocate(int totalSeconds, List<String> difficulties) {
        int n = difficulties.size();
        int[] out = new int[n];
        if (n == 0 || totalSeconds <= 0) return out;
        long sumWeight = 0;
        for (String d : difficulties) sumWeight += weightOf(d);
        long used = 0;
        for (int i = 0; i < n; i++) {
            out[i] = (int) (totalSeconds * (long) weightOf(difficulties.get(i)) / sumWeight);
            used += out[i];
        }
        out[n - 1] += (int) (totalSeconds - used);   // the seconds lost by rounding go to the last question

        if (totalSeconds >= (long) n * MIN_SECONDS) {
            int deficit = 0;
            for (int i = 0; i < n; i++) {
                if (out[i] < MIN_SECONDS) {
                    deficit += MIN_SECONDS - out[i];
                    out[i] = MIN_SECONDS;
                }
            }
            // pay for the raised ones with the questions that have plenty, one second at a time, longest first
            while (deficit > 0) {
                int richest = -1;
                for (int i = 0; i < n; i++) if (out[i] > MIN_SECONDS && (richest < 0 || out[i] > out[richest])) richest = i;
                if (richest < 0) break;   // cannot happen: the total allows MIN_SECONDS for everybody
                out[richest]--;
                deficit--;
            }
        }
        return out;
    }

    // ─── deadline ────────────────────────────────────────────────

    /** Start + working time, cut at the end of the exam when there is one. */
    static OffsetDateTime deadline(OffsetDateTime startedAt, int durationMinutes, OffsetDateTime examEnd) {
        OffsetDateTime d = startedAt.plusMinutes(Math.max(1, durationMinutes));
        return examEnd != null && examEnd.isBefore(d) ? examEnd : d;
    }

    // ─── leaving the screen ──────────────────────────────────────

    static String normalizePolicy(String raw) {
        return POLICY_LOCK.equalsIgnoreCase(raw == null ? "" : raw.trim()) ? POLICY_LOCK : POLICY_FLAG;
    }

    /** Leaving the screen locks the exam. */
    static boolean locksOnLeave(boolean allowReference, String policy) {
        return !allowReference && POLICY_LOCK.equals(normalizePolicy(policy));
    }

    /** The paper is flagged as a violation when it is marked. With LOCK the teacher already decided by unlocking. */
    static boolean flagsViolation(boolean allowReference, String policy, int leftCount) {
        return !allowReference && POLICY_FLAG.equals(normalizePolicy(policy)) && leftCount > 0;
    }

    static String leaveReason(int leftCount) {
        return "Thoát khỏi màn hình làm bài " + leftCount + " lần";
    }

    // ─── answers kept on the server ──────────────────────────────

    /** {1=A, 2=B,C} -> "1=A;2=B,C" (blank answers are left out). */
    static String encodeAnswers(Map<Integer, String> answers) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<Integer, String> e : new TreeMap<>(answers).entrySet()) {
            if (e.getValue() == null || e.getValue().isBlank()) continue;
            if (sb.length() > 0) sb.append(';');
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        return sb.toString();
    }

    static Map<Integer, String> decodeAnswers(String text) {
        Map<Integer, String> out = new TreeMap<>();
        if (text == null || text.isBlank()) return out;
        for (String part : text.split(";")) {
            int eq = part.indexOf('=');
            if (eq <= 0) continue;
            try {
                out.put(Integer.parseInt(part.substring(0, eq).trim()), part.substring(eq + 1).trim());
            } catch (NumberFormatException ignored) {
                // a damaged entry is dropped
            }
        }
        return out;
    }

    // ─── which version a student gets ────────────────────────────

    /** The version handed out the fewest times so far (ties: random), so the versions are spread evenly over the class. */
    static long pickLeastUsed(List<Long> versionIds, Map<Long, Long> handedOut, Random random) {
        if (versionIds.isEmpty()) throw new IllegalArgumentException("no versions");
        long min = Long.MAX_VALUE;
        for (Long id : versionIds) min = Math.min(min, handedOut.getOrDefault(id, 0L));
        List<Long> candidates = new ArrayList<>();
        for (Long id : versionIds) if (handedOut.getOrDefault(id, 0L) == min) candidates.add(id);
        return candidates.get(random.nextInt(candidates.size()));
    }
}
