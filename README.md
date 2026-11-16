# Test Marking

## 1. Giới thiệu

**Test Marking** là hệ thống hỗ trợ giảng viên quản lý lớp học, tổ chức kỳ thi và chấm bài trắc nghiệm bằng công nghệ nhận dạng dấu chọn **OMR (Optical Mark Recognition)**.

Hệ thống số hóa quy trình tổ chức và chấm thi, từ quản lý lớp học, xây dựng đề thi đến thu thập và xử lý bài làm của học sinh. Ứng dụng di động hỗ trợ quét phiếu trả lời, xử lý ảnh và chấm thi tự động, đồng thời cho phép học sinh thi trực tiếp trên điện thoại và làm bài khi mất kết nối mạng.

Dự án gồm ba thành phần chính:

- **Backend:** Cung cấp API, xử lý nghiệp vụ, chấm điểm, quản lý dữ liệu và phân quyền người dùng.
- **Frontend:** Giao diện web phục vụ việc quản lý lớp học, ngân hàng câu hỏi, mẫu phiếu, kỳ thi và kết quả.
- **Android:** Ứng dụng di động phục vụ chấm phiếu bằng camera (OMR), học sinh nộp phiếu giấy, làm bài thi trực tuyến và tương tác trong lớp học.

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | Java 23, Spring Boot 4.1.1, Spring Data JPA, Maven |
| Xác thực và phân quyền | Spring Security, JWT |
| Cơ sở dữ liệu | PostgreSQL 15 |
| Lưu trữ tệp | RustFS (tương thích S3/MinIO) |
| Gửi email | SMTP (Spring Mail) |
| Môi trường triển khai dịch vụ | Docker, Docker Compose |
| Android | Kotlin, CameraX, Retrofit, Koin, Coil |
| Nhận dạng phiếu (OMR) | C++ (NDK/CMake) + OpenCV, marker AprilTag 16h5 |
| Công cụ phát triển Frontend | Visual Studio Code |
| Công cụ phát triển Backend | IntelliJ IDEA |
| Phát triển ứng dụng di động | Android Studio |

## 3. Chức năng hệ thống

### 3.1. Chức năng quản lý người dùng

- Đăng ký tài khoản và xác thực email.
- Đăng nhập bằng JWT, cập nhật hồ sơ và ảnh đại diện.
- Phân quyền theo từng lớp học (xem mục 7).

### 3.2. Chức năng dành cho giảng viên (người tạo lớp)

- Tạo và quản lý lớp học; tạo mã tham gia lớp.
- Duyệt hoặc từ chối yêu cầu tham gia, quản lý danh sách học sinh, nhập danh sách học sinh từ Excel.
- Đăng thông báo, ghim bài, kiểm duyệt bài đăng và bình luận.
- Quản lý ngân hàng câu hỏi, tạo đề thi và sinh nhiều mã đề.
- Thiết kế mẫu phiếu trả lời và xuất PDF để in.
- Tạo kỳ thi với ba hình thức: **OFFLINE**, **SUBMIT**, **ONLINE**.
- Chấm phiếu bằng camera điện thoại, theo dõi bài làm, vi phạm, thống kê và phân tích từng câu.
- Công bố kết quả và xuất Excel/PDF.

### 3.3. Chức năng dành cho học sinh

- Tham gia lớp học bằng mã tham gia.
- Xem các lớp học, kỳ thi, bảng tin lớp; đăng bài, bình luận, bày tỏ cảm xúc.
- Làm bài thi trực tuyến trên điện thoại (hỗ trợ mất mạng, đồng bộ lại khi có kết nối).
- Chụp và nộp phiếu trả lời giấy ở kỳ thi hình thức SUBMIT.
- Xem điểm và đáp án sau khi giảng viên công bố kết quả.

### 3.4. Chức năng nhận dạng và chấm thi OMR

- Quét phiếu bằng ứng dụng Android; kiểm tra đủ 12 marker AprilTag theo thời gian thực trước khi cho chụp.
- Xử lý ảnh bằng C++/OpenCV: nắn phẳng ảnh (perspective/TPS), ngưỡng thích nghi, đọc mật độ ô tô.
- Nhận dạng mã học sinh (`HS` + 8 chữ số), mã đề (3 chữ số) và đáp án. Điện thoại chỉ đọc phiếu; **server chấm điểm**.
- Hỗ trợ chọn nhiều ảnh từ thư viện để chấm theo lô và xem lại bài đã chấm (xanh = đúng, đỏ = sai).

## 4. Cấu trúc dự án

Cấu trúc tổng thể của repository được tổ chức thành các thư mục riêng cho từng thành phần:

```text
Test Marking/
├── Backend/
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── .env
│   └── ...
├── Frontend/
│   └── ...
├── Android/
│   └── ...
└── README.md
```

Trong đó:

- `Backend/`: Chứa mã nguồn Spring Boot, cấu hình kết nối cơ sở dữ liệu và Docker Compose.
- `Frontend/`: Chứa mã nguồn giao diện web.
- `Android/`: Chứa mã nguồn ứng dụng di động Android (Kotlin + mã C++ OMR).
- `docker-compose.yml`: Khai báo các dịch vụ PostgreSQL và RustFS.
- `.env.example`: File mẫu chứa các biến môi trường cần thiết.
- `.env`: File cấu hình môi trường thực tế, không nên đưa thông tin xác thực vào repository công khai.

## 5. Yêu cầu môi trường

Trước khi khởi chạy hệ thống, cần chuẩn bị các công cụ sau:

- Git.
- Docker và Docker Compose.
- JDK 23 (theo cấu hình `java.version` của dự án Spring Boot) và Maven (hoặc Maven Wrapper nếu có).
- IntelliJ IDEA để chạy Backend.
- Node.js và npm để chạy Frontend.
- Visual Studio Code để phát triển Frontend.
- Android Studio để phát triển ứng dụng di động Android, kèm **Android NDK** và **CMake** (cài qua SDK Manager).
- **OpenCV Android SDK** (tải riêng, không đi kèm repository) để biên dịch phần C++ OMR.

## 6. Hướng dẫn khởi tạo hệ thống

### 6.1. Tải mã nguồn

Clone repository về máy tính và di chuyển vào thư mục dự án `Test Marking`.

```bash
git clone https://github.com/R1cky988/Test-Marking.git
cd "Test Marking"
```

### 6.2. Cấu hình biến môi trường

Di chuyển vào thư mục `Backend`:

```bash
cd Backend
```

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Trên Windows Command Prompt, có thể sử dụng:

```cmd
copy .env.example .env
```

Mở file `.env` và cấu hình các thông tin cần thiết:

```dotenv
POSTGRES_DB=omr_db
POSTGRES_USER=your_postgres_username
POSTGRES_PASSWORD=your_postgres_password_here

# RustFS Storage Credentials
RUSTFS_ACCESS_KEY=your_rustfs_username
RUSTFS_SECRET_KEY=your_rustfs_password_here

JWT_SECRET=your_secret_key

SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-email@gmail.com
SPRING_MAIL_PASSWORD=your-app-password
```

Các giá trị trên là ví dụ minh họa. Hãy sử dụng thông tin xác thực phù hợp với môi trường của bạn và bảo đảm các giá trị được khai báo đầy đủ.

**Lưu ý:**

- `JWT_SECRET` nên là chuỗi ngẫu nhiên đủ dài (tối thiểu 32 ký tự).
- Hệ thống gửi email xác thực khi đăng ký, nên cần cấu hình SMTP đúng. Với Gmail, hãy dùng **App Password** (cần bật xác minh 2 bước), không dùng mật khẩu đăng nhập.

### 6.3. Khởi chạy PostgreSQL và RustFS

Tại thư mục `Backend`, nơi chứa file `docker-compose.yml`, thực hiện lệnh:

```bash
docker compose up -d
```

Docker Compose sẽ khởi chạy hai dịch vụ:

| Dịch vụ | Địa chỉ | Mục đích |
|---|---|---|
| PostgreSQL | `localhost:5432` | Lưu trữ dữ liệu của hệ thống |
| RustFS API | `localhost:9000` | Tiếp nhận các thao tác lưu trữ tệp |
| RustFS Console | `localhost:9001` | Giao diện quản lý lưu trữ |

Kiểm tra trạng thái các container:

```bash
docker compose ps
```

Để xem nhật ký hoạt động của các dịch vụ:

```bash
docker compose logs -f
```

**Lưu ý:** Các cổng trên được ánh xạ theo cấu hình Docker Compose của dự án. Cần bảo đảm các cổng này chưa bị chiếm dụng bởi ứng dụng khác.

### 6.4. Khởi chạy Backend

1. Mở thư mục `Backend` bằng IntelliJ IDEA.
2. Chờ IDE tải các dependency và đồng bộ dự án Maven.
3. Kiểm tra cấu hình kết nối PostgreSQL và RustFS (endpoint, access key, tên bucket) trong file `application.yml` hoặc các file cấu hình liên quan; bucket cần tồn tại hoặc được cấu hình để ứng dụng sử dụng.
4. Thiết lập các biến môi trường cần thiết trong cấu hình chạy ứng dụng của IntelliJ IDEA.
5. Chạy lớp khởi tạo chính của ứng dụng Spring Boot.

Backend cần được cấu hình kết nối đến PostgreSQL tại `localhost:5432` khi chạy trực tiếp trên máy tính.

**Khởi tạo cấu trúc cơ sở dữ liệu:** Với cấu hình Hibernate `ddl-auto: update`, hệ thống có thể tự động tạo các bảng tương ứng với JPA Entity và **thêm** cột/bảng mới khi ứng dụng khởi chạy. Database PostgreSQL phải tồn tại trước khi backend kết nối; các bảng của hệ thống không cần tạo thủ công trong trường hợp cấu hình này hoạt động đúng.

**Lưu ý về biến môi trường:** File `.env` được Docker Compose sử dụng để cấu hình các container. Khi chạy Spring Boot trực tiếp từ IntelliJ IDEA, cần bảo đảm các biến môi trường mà backend yêu cầu cũng được cung cấp cho tiến trình Java, trừ khi dự án đã có cơ chế đọc file `.env` riêng.

**Lưu ý về CORS:** Backend hiện cho phép nguồn `http://localhost:5173` (Vite). Khi triển khai ở địa chỉ khác, cần thêm địa chỉ đó vào cấu hình CORS.

### 6.5. Khởi chạy Frontend

Mở một terminal mới và di chuyển vào thư mục `Frontend`:

```bash
cd Frontend
```

Cài đặt các dependency:

```bash
npm install
```

Khởi chạy máy chủ phát triển:

```bash
npm run dev
```

Sau khi khởi chạy thành công, truy cập địa chỉ được hiển thị trong terminal (mặc định `http://localhost:5173`) để sử dụng giao diện web.

Nếu frontend cần gọi API của backend, hãy kiểm tra biến môi trường cấu hình địa chỉ API và bảo đảm backend đang hoạt động tại địa chỉ tương ứng.

### 6.6. Ứng dụng Android

Mã nguồn Android được quản lý trong thư mục `Android` và được phát triển bằng Android Studio với Kotlin; phần nhận dạng phiếu viết bằng C++ (NDK/CMake) dùng OpenCV.

1. **Cài công cụ:** trong Android Studio → SDK Manager, cài Android SDK, **NDK** và **CMake**.
2. **Thêm OpenCV Android SDK:** tải OpenCV cho Android (không đi kèm repository), giải nén, rồi khai báo đường dẫn tới SDK trong `settings.gradle.kts` theo chú thích có sẵn trong file. Phần C++ đọc `native/jni/OpenCVConfig.cmake` từ thư mục này. Nếu thiếu OpenCV, ứng dụng vẫn biên dịch được phần Kotlin nhưng chức năng đọc phiếu sẽ báo lỗi.
3. **Địa chỉ server:** cấu hình địa chỉ Backend mà ứng dụng sẽ gọi trong `ServerConfig` (hoặc màn hình cấu hình server của app). Khi chạy trên **máy ảo Android**, máy tính chủ có địa chỉ `10.0.2.2`; khi chạy trên **điện thoại thật**, dùng địa chỉ IP LAN của máy tính (cùng mạng Wi-Fi) và bảo đảm tường lửa cho phép truy cập.
4. Đồng bộ Gradle, chọn thiết bị (nên dùng điện thoại thật để thử camera) và chạy ứng dụng. Yêu cầu Android 7.0 (API 24) trở lên.
5. **Phiếu trả lời:** in phiếu từ chức năng xuất PDF của mẫu phiếu trên web (có đủ 12 marker AprilTag). Khi chụp, cần đủ sáng và thấy trọn các marker.

## 7. Phân quyền người dùng

Quyền được xác định **theo từng lớp học**, không chỉ theo vai trò toàn cục của tài khoản:

- **Giảng viên của lớp** là người tạo lớp đó.
- **Học sinh của lớp** là người đã được duyệt tham gia lớp (có trong danh sách thành viên).
- Một tài khoản có thể là giảng viên ở lớp này và học sinh ở lớp khác. Việc kiểm tra quyền được thực hiện ở tầng nghiệp vụ của backend.

| Đối tượng | Chức năng chính |
|---|---|
| Khách (chưa đăng nhập) | Đăng ký, xác thực email, đăng nhập |
| Học sinh của lớp | Tham gia lớp bằng mã, đăng bài thường và bình luận, làm bài thi online, nộp phiếu giấy của chính mình (kỳ thi SUBMIT), xem kết quả của mình sau khi được công bố |
| Giảng viên của lớp | Quản lý lớp và thành viên, đăng thông báo/ghim/kiểm duyệt, quản lý câu hỏi, đề, mẫu phiếu, tổ chức kỳ thi, chấm phiếu bằng camera, theo dõi vi phạm, công bố và xuất kết quả |

Quy trình sử dụng cơ bản:

1. Người dùng đăng ký tài khoản và xác thực email.
2. Giảng viên tạo lớp học và cung cấp mã tham gia.
3. Học sinh dùng mã để gửi yêu cầu tham gia; giảng viên duyệt yêu cầu (hoặc nhập danh sách học sinh từ Excel).
4. Giảng viên tạo đề, mẫu phiếu và kỳ thi; học sinh thi online hoặc nộp phiếu giấy, hoặc giảng viên chấm phiếu bằng camera.
5. Giảng viên công bố kết quả; học sinh xem điểm, giảng viên xuất báo cáo.

## 8. Quản lý dữ liệu và lưu trữ

- **PostgreSQL:** Lưu trữ dữ liệu nghiệp vụ như tài khoản, lớp học, thành viên, bài đăng, đề thi, kỳ thi và kết quả.
- **RustFS:** Cung cấp dịch vụ lưu trữ đối tượng, lưu ảnh đại diện, tệp đính kèm lớp học và ảnh phiếu trả lời đã chấm.
- **Docker volumes:** Duy trì dữ liệu của PostgreSQL và RustFS giữa các lần khởi động container theo cấu hình hiện tại.

Để dừng các dịch vụ mà không xóa dữ liệu đã lưu trong volumes, sử dụng:

```bash
docker compose down
```

Để khởi chạy lại các dịch vụ, sử dụng:

```bash
docker compose up -d
```

Không sử dụng tùy chọn `-v` khi dừng dịch vụ nếu cần giữ lại dữ liệu trong các volumes.

## 9. Lưu ý bảo mật

- Không đưa file `.env` chứa mật khẩu hoặc khóa truy cập thực tế lên repository.
- Chỉ cung cấp file `.env.example` với các giá trị mẫu để hướng dẫn cấu hình.
- Không sử dụng thông tin xác thực mặc định hoặc mật khẩu yếu trong môi trường triển khai thực tế.
- Cần cấu hình bảo mật phù hợp cho API, tài khoản người dùng và dịch vụ lưu trữ trước khi đưa hệ thống vào sử dụng chính thức.
- Hiện cấu hình bảo mật HTTP cho phép mọi yêu cầu đi qua filter và kiểm tra quyền ở tầng nghiệp vụ; khi triển khai thực tế nên rà soát lại.
