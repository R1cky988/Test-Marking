# Test Marking

## 1. Giới thiệu

**Test Marking** là hệ thống hỗ trợ giảng viên quản lý lớp học, tổ chức kỳ thi và chấm bài trắc nghiệm bằng công nghệ nhận dạng dấu chọn **OMR (Optical Mark Recognition)**.

Hệ thống hướng đến việc số hóa quy trình tổ chức và chấm thi, từ quản lý lớp học, xây dựng đề thi đến thu thập và xử lý bài làm của học sinh. Ứng dụng di động được định hướng hỗ trợ quét phiếu trả lời, xử lý ảnh và chấm thi tự động, đồng thời mở rộng khả năng tổ chức thi trực tiếp trên điện thoại và xử lý bài thi ngoại tuyến.

Dự án gồm ba thành phần chính:

- **Backend:** Cung cấp API, xử lý nghiệp vụ, quản lý dữ liệu và phân quyền người dùng.
- **Frontend:** Giao diện web phục vụ việc quản lý lớp học, kỳ thi và các chức năng liên quan.
- **Android:** Ứng dụng di động phục vụ các chức năng liên quan đến làm bài thi và xử lý phiếu trả lời OMR.

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Java, Spring Boot, Spring Data JPA |
| Xác thực và phân quyền | Spring Security, JWT |
| Cơ sở dữ liệu | PostgreSQL 15 |
| Lưu trữ tệp | RustFS |
| Môi trường triển khai dịch vụ | Docker, Docker Compose |
| Công cụ phát triển Frontend | Visual Studio Code |
| Công cụ phát triển Backend | IntelliJ IDEA |
| Phát triển ứng dụng di động | Android Studio, Kotlin |

## 3. Chức năng hệ thống

### 3.1. Chức năng quản lý người dùng

- Đăng ký tài khoản.
- Xác thực người dùng và phân quyền truy cập theo vai trò.
- Hỗ trợ các vai trò giảng viên và học sinh trong quá trình sử dụng hệ thống.

### 3.2. Chức năng dành cho giảng viên

- Tạo và quản lý lớp học.
- Tạo mã tham gia lớp học để học sinh đăng ký tham gia.
- Quản lý danh sách học sinh trong lớp.
- Tạo và quản lý kỳ thi, đề thi.
- Theo dõi kết quả và hỗ trợ chấm bài trắc nghiệm.

### 3.3. Chức năng dành cho học sinh

- Tham gia lớp học bằng mã tham gia.
- Xem các lớp học và kỳ thi được phân công.
- Làm bài thi trực tiếp trên điện thoại theo hình thức thi trực tuyến được hỗ trợ.

### 3.4. Chức năng nhận dạng và chấm thi OMR

Các chức năng định hướng phát triển bao gồm:

- Quét phiếu trả lời bằng ứng dụng Android.
- Xử lý ảnh phiếu trả lời để phục vụ việc nhận dạng.
- Nhận dạng đáp án và chấm điểm trắc nghiệm tự động.
- Hỗ trợ quy trình quét và xử lý bài thi ngoại tuyến.

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
- `Android/`: Chứa mã nguồn ứng dụng di động Android.
- `docker-compose.yml`: Khai báo các dịch vụ PostgreSQL và RustFS.
- `.env.example`: File mẫu chứa các biến môi trường cần thiết.
- `.env`: File cấu hình môi trường thực tế, không nên đưa thông tin xác thực vào repository công khai.

## 5. Yêu cầu môi trường

Trước khi khởi chạy hệ thống, cần chuẩn bị các công cụ sau:

- Git.
- Docker và Docker Compose.
- JDK tương thích với cấu hình của dự án Spring Boot.
- IntelliJ IDEA để chạy Backend.
- Node.js và npm để chạy Frontend.
- Visual Studio Code để phát triển Frontend.
- Android Studio để phát triển ứng dụng di động Android.

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

# MinIO Storage Credentials
RUSTFS_ACCESS_KEY=your_rustfs_username
RUSTFS_SECRET_KEY=your_minio_password_here

JWT_SECRET=your_secret_key

SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-email@gmail.com
SPRING_MAIL_PASSWORD=your-app-password
```

Các giá trị trên là ví dụ minh họa. Hãy sử dụng thông tin xác thực phù hợp với môi trường của bạn và bảo đảm các giá trị được khai báo đầy đủ.

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
3. Kiểm tra cấu hình kết nối PostgreSQL và RustFS trong file `application.yml` hoặc các file cấu hình liên quan.
4. Thiết lập các biến môi trường cần thiết trong cấu hình chạy ứng dụng của IntelliJ IDEA.
5. Chạy lớp khởi tạo chính của ứng dụng Spring Boot.

Backend cần được cấu hình kết nối đến PostgreSQL tại `localhost:5432` khi chạy trực tiếp trên máy tính.

**Khởi tạo cấu trúc cơ sở dữ liệu:** Với cấu hình Hibernate `ddl-auto: update`, hệ thống có thể tự động tạo các bảng tương ứng với JPA Entity và cập nhật những thay đổi cấu trúc được hỗ trợ khi ứng dụng khởi chạy. Database PostgreSQL phải tồn tại trước khi backend kết nối; các bảng của hệ thống không cần tạo thủ công trong trường hợp cấu hình này hoạt động đúng.

**Lưu ý về biến môi trường:** File `.env` được Docker Compose sử dụng để cấu hình các container. Khi chạy Spring Boot trực tiếp từ IntelliJ IDEA, cần bảo đảm các biến môi trường mà backend yêu cầu cũng được cung cấp cho tiến trình Java, trừ khi dự án đã có cơ chế đọc file `.env` riêng.

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

Sau khi khởi chạy thành công, truy cập địa chỉ được hiển thị trong terminal để sử dụng giao diện web.

Nếu frontend cần gọi API của backend, hãy kiểm tra biến môi trường cấu hình địa chỉ API và bảo đảm backend đang hoạt động tại địa chỉ tương ứng.

### 6.6. Ứng dụng Android

Mã nguồn Android được quản lý trong thư mục `Android` và được phát triển bằng Android Studio với Kotlin.

Các bước thiết lập chi tiết, cấu hình thiết bị hoặc trình giả lập và hướng dẫn chạy ứng dụng sẽ được bổ sung khi thành phần Android được hoàn thiện.

## 7. Phân quyền người dùng

Hệ thống định hướng phân chia quyền theo vai trò:

| Vai trò | Chức năng chính |
|---|---|
| Người dùng (User) | Đăng ký tài khoản và sử dụng các chức năng được cấp quyền |
| Giảng viên (Teacher) | Tạo và quản lý lớp học, quản lý học sinh và tổ chức kỳ thi |
| Học sinh (Student) | Tham gia lớp học bằng mã tham gia và thực hiện các bài thi được giao |

Quy trình sử dụng cơ bản:

1. Người dùng đăng ký tài khoản.
2. Giảng viên tạo lớp học và cung cấp mã tham gia.
3. Học sinh sử dụng mã để gửi yêu cầu tham gia hoặc tham gia lớp học theo cơ chế được cấu hình.
4. Giảng viên tổ chức kỳ thi và học sinh thực hiện bài thi theo các chức năng hệ thống hỗ trợ.

## 8. Quản lý dữ liệu và lưu trữ

- **PostgreSQL:** Lưu trữ dữ liệu nghiệp vụ như tài khoản, lớp học, thành viên và thông tin kỳ thi.
- **RustFS:** Cung cấp dịch vụ lưu trữ đối tượng, phục vụ nhu cầu lưu trữ tệp của hệ thống.
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

