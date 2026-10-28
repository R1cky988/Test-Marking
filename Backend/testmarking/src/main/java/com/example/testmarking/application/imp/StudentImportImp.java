package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.UserRepository;
import com.example.testmarking.adapter.rest.dtos.response.ImportRowResponse;
import com.example.testmarking.adapter.rest.dtos.response.ImportStudentsResponse;
import com.example.testmarking.application.imp.ClassAccessImp.Access;
import com.example.testmarking.application.imp.SimpleXlsxReader.Row;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.ports.EmailPort;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Teacher of a class imports an .xlsx with the columns STT, Name, Registed Email.
 *  - the e-mail already has an account  -> no new account (nothing changes for it), but it is added to the class
 *  - the e-mail has no account          -> an account is created (8-character random password, at least one letter and
 *    one digit, letters in random case), the person is added to the class, and the login is e-mailed to him
 *    ("Tài khoản của bạn": Email + Mật khẩu). The password is never returned to the browser.
 * Not one big transaction: every row stands alone, so one bad row never undoes the others.
 */
@Service
public class StudentImportImp {

    public static final long MAX_BYTES = 5L * 1024 * 1024;
    public static final int MAX_ROWS = 200;

    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    private static final String LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String DIGITS = "0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClassAccessImp access;
    private final UserRepository users;
    private final ImportedAccountImp accounts;
    private final EmailPort mail;
    private final PasswordEncoder passwordEncoder;

    public StudentImportImp(ClassAccessImp access, UserRepository users, ImportedAccountImp accounts, EmailPort mail, PasswordEncoder passwordEncoder) {
        this.access = access;
        this.users = users;
        this.accounts = accounts;
        this.mail = mail;
        this.passwordEncoder = passwordEncoder;
    }

    public ImportStudentsResponse importStudents(User me, UUID classId, byte[] file) {
        Access a = access.requireOwner(me, classId);
        if (Boolean.TRUE.equals(a.cls().getIsArchived())) {
            throw TemplateException.badRequestWithCode("CLASS_ARCHIVED", "Lớp đã lưu trữ, hãy khôi phục trước khi thêm học sinh");
        }
        if (file == null || file.length == 0) throw TemplateException.badRequest("Chưa chọn tệp", "file: is required");
        if (file.length > MAX_BYTES) throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Tệp vượt quá 5MB");

        List<Row> sheet = SimpleXlsxReader.readFirstSheet(file);
        Header h = findHeader(sheet);
        List<Row> data = new ArrayList<>();
        for (Row r : sheet) if (r.number() > h.rowNumber && !r.blank()) data.add(r);
        if (data.size() > MAX_ROWS) {
            throw TemplateException.badRequestWithCode("TOO_MANY_ROWS", "Tối đa " + MAX_ROWS + " dòng mỗi lần", "rows=" + data.size());
        }

        List<ImportRowResponse> rows = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int created = 0, existing = 0, invalid = 0, failed = 0;
        for (Row r : data) {
            String name = clean(r.cell(h.nameCol));
            String email = clean(r.cell(h.emailCol)).toLowerCase(Locale.ROOT);
            if (!EMAIL.matcher(email).matches() || email.length() > 254) {
                rows.add(row(r, name, email, "INVALID_EMAIL", "Email không hợp lệ"));
                invalid++;
            } else if (!seen.add(email)) {
                rows.add(row(r, name, email, "DUPLICATE_IN_FILE", "Email bị lặp trong tệp"));
                invalid++;
            } else if (users.findByEmail(email).isPresent()) {
                User u = users.findByEmail(email).get();
                try {
                    boolean added = accounts.addExisting(a.cls(), u);
                    rows.add(row(r, name, email, added ? "EXISTS_ADDED" : "EXISTS_IN_CLASS",
                            added ? "Đã có tài khoản, không tạo mới, đã thêm vào lớp" : "Đã có tài khoản và đã ở trong lớp"));
                    existing++;
                } catch (RuntimeException e) {
                    rows.add(row(r, name, email, "FAILED", "Không thêm được vào lớp"));
                    failed++;
                }
            } else {
                ImportRowResponse res = createAndMail(a, r, name, email);
                rows.add(res);
                if (res.status().equals("CREATED")) created++; else failed++;
            }
        }
        return new ImportStudentsResponse(data.size(), created, existing, invalid, failed, rows);
    }

    private ImportRowResponse createAndMail(Access a, Row r, String name, String email) {
        String password = generatePassword();
        String[] n = splitName(name, email);
        User user;
        try {
            user = accounts.create(a.cls(), email, n[0], n[1], passwordEncoder.encode(password));
        } catch (RuntimeException e) {
            return row(r, name, email, "FAILED", "Không tạo được tài khoản");
        }
        try {
            mail.sendAccountEmail(email, email, password);
        } catch (RuntimeException e) {
            try {
                accounts.remove(user.getId());   // nobody would ever learn the password
            } catch (RuntimeException ignored) {
                // the row below still tells the teacher what happened
            }
            return row(r, name, email, "EMAIL_FAILED", "Không gửi được email, chưa tạo tài khoản");
        }
        return row(r, name, email, "CREATED", "Đã tạo tài khoản và gửi email");
    }

    // ─── header ──────────────────────────────────────────────────

    private record Header(int rowNumber, int emailCol, int nameCol) {}

    /** Looks for the header in the first 10 rows: "Registed Email" (also "Registered Email" / "Email") and "Name". */
    private static Header findHeader(List<Row> sheet) {
        int limit = Math.min(sheet.size(), 10);
        for (int i = 0; i < limit; i++) {
            Row r = sheet.get(i);
            int email = -1, name = -1;
            for (int c = 0; c < r.cells().size(); c++) {
                String k = key(r.cell(c));
                if (email < 0 && (k.equals("registedemail") || k.equals("registeredemail") || k.equals("email"))) email = c;
                if (name < 0 && (k.equals("name") || k.equals("fullname") || k.equals("hovaten") || k.equals("hoten") || k.equals("ten"))) name = c;
            }
            if (email >= 0) return new Header(r.number(), email, name);
        }
        throw TemplateException.badRequestWithCode("MISSING_COLUMNS", "Thiếu cột \"Registed Email\"",
                "expected header: STT, Name, Registed Email");
    }

    private static String key(String s) {
        return s == null ? "" : java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    // ─── helpers ─────────────────────────────────────────────────

    /** "Nguyễn Thị Lan" -> first name "Lan", last name "Nguyễn Thị" (the app shows "last first"). No name -> the part of the e-mail before @. */
    static String[] splitName(String name, String email) {
        String n = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (n.isEmpty()) return new String[]{email.substring(0, email.indexOf('@')), ""};
        int cut = n.lastIndexOf(' ');
        return cut < 0 ? new String[]{n, ""} : new String[]{n.substring(cut + 1), n.substring(0, cut)};
    }

    /** 8 characters: at least one digit and one letter, every letter randomly upper or lower case. */
    static String generatePassword() {
        char[] pw = new char[8];
        pw[0] = randomLetter();
        pw[1] = DIGITS.charAt(RANDOM.nextInt(DIGITS.length()));
        for (int i = 2; i < pw.length; i++) {
            pw[i] = RANDOM.nextBoolean() ? randomLetter() : DIGITS.charAt(RANDOM.nextInt(DIGITS.length()));
        }
        for (int i = pw.length - 1; i > 0; i--) {   // shuffle so the letter / digit are not always first
            int j = RANDOM.nextInt(i + 1);
            char t = pw[i]; pw[i] = pw[j]; pw[j] = t;
        }
        return new String(pw);
    }

    private static char randomLetter() {
        return LETTERS.charAt(RANDOM.nextInt(LETTERS.length()));
    }

    private static String clean(String s) {
        return s == null ? "" : s.replace(' ', ' ').trim();
    }

    private static ImportRowResponse row(Row r, String name, String email, String status, String message) {
        return new ImportRowResponse(r.number(), name, email, status, message);
    }
}
