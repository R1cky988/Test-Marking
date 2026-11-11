# TestMarking (Android) – phần gốc

Ứng dụng Android hợp nhất: lớp mình tạo = Giáo viên, lớp mình tham gia = Học sinh.

## Đã có
- Đăng nhập / Đăng ký / Xác nhận email (mã 6 số, gửi lại sau 60s)
- Token tự làm mới (TokenAuthenticator), lưu phiên, hết hạn tự về đăng nhập
- Tab: Lớp tôi dạy / Lớp tôi học / Cá nhân; tạo lớp, tham gia lớp bằng mã, chi tiết lớp
- Giao diện xanh dương đồng bộ web, hỗ trợ chế độ tối

## Cách chạy
1. Mở thư mục bằng Android Studio (Ladybug trở lên, JDK 17+), chờ Gradle sync.
2. Emulator: dùng sẵn http://10.0.2.2:8080/api/v1/
3. Máy thật: nhấn biểu tượng bánh răng ở màn đăng nhập (hoặc tab Cá nhân) -> "Địa chỉ máy chủ", nhập IP máy chạy BE.

## Lưu ý
Dự án chưa được biên dịch thử (môi trường tạo không có Android SDK). Nếu Gradle/compile báo lỗi, gửi lại log để sửa.
