1. Thông tin chung & Quy chuẩn thiết kế
Người dùng mục tiêu: 100% dành cho Giáo viên (Teacher)
.
Màu sắc ngữ nghĩa (Semantic Colors): Yêu cầu bắt buộc định nghĩa bộ màu Visual Debug gồm Xanh lá (Câu đúng), Đỏ (Câu sai), Vàng (Bỏ sót hoặc nghi vấn tẩy xóa)
. Màu trạng thái kỳ thi: Draft (Nháp), Active (Đang mở), Closed (Đã đóng)
.
Bố cục (Layout): Sidebar điều hướng luôn hiển thị, hỗ trợ Responsive trên Desktop (từ 1024px trở lên). Cần thiết kế hệ thống Toast Notification để nhận cảnh báo theo thời gian thực (ví dụ: vi phạm chế độ thi)
.

--------------------------------------------------------------------------------
2. Chi tiết các màn hình cần thiết kế (Theo luồng nghiệp vụ)
2.1. Nhóm Tài khoản & Đăng nhập
Màn hình Đăng nhập (/login): Form đăng nhập bằng Email/Mật khẩu hoặc xác thực nhanh qua nút "Đăng nhập bằng Google"
. Có liên kết "Quên mật khẩu" yêu cầu nhập mã OTP (6 chữ số)
.
Màn hình Đăng ký (/register): Do không có Admin cấp tài khoản, hệ thống cần form cho giáo viên tự đăng ký (Họ tên, Email, Mật khẩu, Bộ môn) và xác thực qua OTP gửi về Email
.
2.2. Dashboard - Bảng điều khiển (/dashboard)
Header: Thanh tìm kiếm, Icon thông báo (Push notifications dạng chuông), Avatar và menu tài khoản.
Thống kê tổng quan: Card hiển thị số lượng Lớp học, Tổng số học sinh, Số kỳ thi đang diễn ra, Số bài nộp chờ xử lý.
Hoạt động gần đây: Bảng danh sách các kỳ thi đang Active hoặc yêu cầu khiếu nại chưa giải quyết
.
2.3. Nhóm Quản lý Đào tạo (Lớp học & Học sinh)
Màn hình Danh sách Lớp (/classes):
Bảng quản lý lớp học theo Năm học và Khối lớp (VD: 10A1, 2024-2025)
.
Thao tác: Thêm mới, Sửa, hoặc Lưu trữ (Archive) lớp học
.
Màn hình Chi tiết Lớp & Học sinh (/classes/:id):
Bảng học sinh gồm Họ tên, Mã học sinh (SBD), Ngày sinh, Email
.
Công cụ Import: Nút "Thêm thủ công" và nút "Import từ Excel" (cho phép tải file mẫu, upload hàng loạt)
.
Bảng preview dữ liệu import để giáo viên đối soát lỗi trùng SBD hoặc sai định dạng trước khi lưu
.
Chức năng "Chuyển lớp" cho học sinh
.
2.4. Nhóm Quản lý Kỳ thi & Cấu hình (/exams)
Danh sách Kỳ thi: Tên kỳ thi, Môn học, Thời gian (phút), Loại hình (Online hoặc Offline/Thi giấy)
.
Tạo/Sửa Kỳ thi (Multi-step Form):
Bước 1 (Thông tin chung): Tên, môn học, thời lượng, số lượng câu hỏi
.
Bước 2 (Gán lớp): Chọn danh sách các lớp sẽ tham gia kỳ thi và thời gian bắt đầu/kết thúc
.
Bước 3 (Cấu hình Online - Nếu là thi qua App học sinh): Thiết lập chế độ khóa thiết bị (Lockdown Mode), số lần cho phép chụp lại bài, và thời gian nhịp tim (Heartbeat interval) để giám sát
.
2.5. Thiết kế Template OMR (/exams/:id/template)
Giao diện Canvas (Kéo thả): Giáo viên upload ảnh phiếu trả lời trắng
. Hệ thống tự nhận diện tọa độ 12 điểm ArUco Marker
.
Công cụ vẽ vùng (ROI): Cung cấp công cụ kéo thả để vẽ khung "Số báo danh", "Mã đề", và "Khung câu hỏi"
. Có popup để cấu hình số hàng, số cột (số đáp án A, B, C, D) cho từng khung
.
Preview & Xuất bản: Hiển thị lưới điểm nội suy màu đỏ/xanh đè lên ảnh. Nút xuất bản thành file PDF khổ A4 chất lượng cao để in ấn
.
2.6. Ngân hàng câu hỏi, Mã đề & Đáp án (Answer Key & Exam Forms)
Ngân hàng câu hỏi (/exams/:id/questions): Bảng nhập chi tiết từng câu hỏi, gán điểm số (point value), chủ đề (topic), và thẻ (tags)
.
Tạo Mã đề (Exam Forms): Form để sinh ra nhiều mã đề khác nhau (VD: MĐ101, MĐ102)
.
Nhập & Trộn đáp án:
Giao diện thủ công: Danh sách câu hỏi kèm Radio buttons (A, B, C, D) để giáo viên click chọn đáp án đúng cho từng mã đề
. Hỗ trợ chọn nhiều đáp án (Multiple choice)
.
Giao diện Import Excel: Tải lên file Excel chứa các cột mã đề để nhập hàng loạt đáp án cùng lúc
.
Cập nhật & Chấm lại (Regrading): Tính năng theo dõi phiên bản (Versioning). Nếu giáo viên phát hiện đề sai và sửa lại đáp án sau khi thi, hệ thống hiển thị nút "Chấm lại toàn bộ" (Regrading Job) để tự động cập nhật điểm
.
2.7. Bài nộp, Chấm điểm & Xử lý Khiếu nại
Danh sách bài nộp (/exams/:id/results): Bảng hiển thị SBD, Điểm số, Độ tin cậy (Confidence score), Trạng thái đồng bộ
.
Giao diện Chi tiết bài làm (Smart View):
Hiển thị ảnh gốc, ảnh đã nắn phẳng, và ảnh Visual Debug (Vẽ vòng tròn xanh/đỏ/vàng) đè lên đáp án
.
Bảng chi tiết từng câu: Đáp án học sinh chọn vs Đáp án đúng. Cho phép giáo viên click trực tiếp để Sửa điểm thủ công nếu máy nhận diện sai vết tẩy xóa
.
Xử lý Khiếu nại (/appeals): Màn hình chia đôi (Dual-screen). Hiển thị danh sách các câu bị học sinh khiếu nại. Tự động cắt (crop) và phóng to chính xác ô đáp án đó. Giáo viên chọn "Chấp nhận" (cập nhật điểm mới) hoặc "Từ chối" kèm ghi chú
.
2.8. Báo cáo, Thống kê & Xuất file (/reports)
Biểu đồ phân tích:
Phổ điểm (Histogram): Số lượng học sinh theo từng khoảng điểm
.
Phân tích câu hỏi: Bảng thống kê tỷ lệ làm đúng từng câu (Difficulty index) và tỷ lệ chọn A/B/C/D
. Cảnh báo màu đỏ/vàng cho các câu có tỷ lệ đúng dưới 10%
.
Export Data: Nút "Xuất báo cáo Excel" (bảng điểm) và nút "Xuất bài làm PDF" (tải về hàng loạt ảnh bài thi đã được khoanh đỏ/xanh)
.
2.9. Lịch sử Hệ thống (Audit Logs)
Màn hình Log (/audit-logs): Dành riêng cho giáo viên tự tra cứu lịch sử tác động vào dữ liệu của mình (Lịch sử tạo, sửa điểm, xóa lớp, sửa đáp án). Bảng hiển thị: Bảng dữ liệu tác động, Hành động, Giá trị cũ (Old values), Giá trị mới (New values)