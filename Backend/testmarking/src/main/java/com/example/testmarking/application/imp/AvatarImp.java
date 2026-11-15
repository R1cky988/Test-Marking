package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.persistance.repository.UserRepository;
import com.example.testmarking.domain.entities.User;
import com.example.testmarking.domain.ports.StoragePort;
import com.example.testmarking.template.exception.TemplateException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Profile picture of a user. The web and the phone send an already cropped square; the server still centres it,
 * scales it down to at most 512 x 512 and stores a JPEG (quality 85), so every avatar is small and has the same format.
 */
@Service
public class AvatarImp {
    public static final long MAX_BYTES = 2L * 1024 * 1024;
    static final int SIZE = 512;
    static final float QUALITY = 0.85f;
    static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    /** where the picture is served: GET {URL_PREFIX}{userUuid}/{file}.jpg (stored in users.avatar_url) */
    public static final String URL_PREFIX = "/api/v1/user/avatars/";
    private static final Pattern KEY = Pattern.compile("^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\\.jpg$");

    public record Download(InputStream stream, String contentType) {}

    private final UserRepository users;
    private final StoragePort storage;
    private final String bucket;
    private final Set<String> readyBuckets = new HashSet<>();

    public AvatarImp(UserRepository users, StoragePort storage, @Value("${storage.buckets.avatar:avatar}") String bucket) {
        this.users = users;
        this.storage = storage;
        this.bucket = bucket;
    }

    /** Stores the picture and returns the user with the new avatar_url. */
    public User update(User me, String contentType, long size, InputStream data) throws IOException {
        if (data == null || size <= 0) throw TemplateException.badRequestWithCode("AVATAR_REQUIRED", "Vui lòng chọn ảnh avatar");
        if (size > MAX_BYTES) throw TemplateException.badRequestWithCode("FILE_TOO_LARGE", "Ảnh avatar tối đa 2MB");
        if (contentType == null || !TYPES.contains(contentType.toLowerCase())) {
            throw TemplateException.badRequestWithCode("INVALID_FILE_TYPE", "Avatar chỉ hỗ trợ JPG, PNG hoặc WEBP", "mime_type=" + contentType);
        }
        byte[] jpeg = toSquareJpeg(data.readAllBytes());

        String name = UUID.randomUUID() + ".jpg";
        String key = me.getUuid() + "/" + name;
        if (readyBuckets.add(bucket)) {
            try {
                storage.ensureBucket(bucket);
            } catch (RuntimeException e) {
                readyBuckets.remove(bucket);
                throw e;
            }
        }
        storage.uploadFile(bucket, key, new ByteArrayInputStream(jpeg), "image/jpeg", jpeg.length);

        User fresh = users.findById(me.getId()).orElse(me);
        fresh.setAvatarUrl(URL_PREFIX + key);
        return users.save(fresh);
    }

    /** key = {userUuid}/{file}.jpg. Only that exact shape is accepted, so a request can never walk out of the bucket. */
    public Download download(String userUuid, String file) {
        String key = userUuid + "/" + file;
        if (!KEY.matcher(key).matches()) throw TemplateException.notFound("AVATAR_NOT_FOUND", "Không tìm thấy avatar");
        try {
            return new Download(storage.getFile(bucket, key), "image/jpeg");
        } catch (RuntimeException e) {
            throw TemplateException.notFound("AVATAR_NOT_FOUND", "Không tìm thấy avatar");
        }
    }

    /** Centre crop to a square, scale down to SIZE (never up), JPEG. A transparent picture gets a white background. */
    static byte[] toSquareJpeg(byte[] bytes) {
        BufferedImage src;
        try {
            src = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            src = null;
        }
        if (src == null || src.getWidth() < 1 || src.getHeight() < 1) {
            throw TemplateException.badRequestWithCode("INVALID_IMAGE", "Không thể xử lý ảnh avatar, hãy chọn ảnh JPG hoặc PNG");
        }
        int side = Math.min(src.getWidth(), src.getHeight());
        int out = Math.min(side, SIZE);
        BufferedImage square = src.getSubimage((src.getWidth() - side) / 2, (src.getHeight() - side) / 2, side, side);
        BufferedImage dst = new BufferedImage(out, out, BufferedImage.TYPE_INT_RGB);
        var g = dst.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, out, out);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(square, 0, 0, out, out, null);
        } finally {
            g.dispose();
        }
        return writeJpeg(dst);
    }

    private static byte[] writeJpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream(); MemoryCacheImageOutputStream ios = new MemoryCacheImageOutputStream(bos)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(QUALITY);
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
            ios.flush();
            return bos.toByteArray();
        } catch (IOException e) {
            throw TemplateException.badRequestWithCode("INVALID_IMAGE", "Không thể xử lý ảnh avatar");
        } finally {
            writer.dispose();
        }
    }
}
