# FrontendWeb - Giao Diện Web Giáo Viên

Đây là giao diện web cho giáo viên trong hệ thống TestMarking OMR. Ứng dụng được xây dựng bằng React, Vite, TypeScript, React Router, TanStack Query và Tailwind CSS.

## 1. Yêu Cầu

- Node.js 20 trở lên.
- npm.
- Backend đang chạy tại `http://localhost:8080/api/v1`.

## 2. Cài Đặt

```bash
cd test-marking
npm install
```

Không cần nộp hoặc copy thư mục `node_modules`. Khi nhận mã nguồn, chỉ cần chạy lại `npm install`.

## 3. Cấu Hình Môi Trường

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Nội dung local thường dùng:

```env
VITE_APP_NAME=OMR Admin
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Nếu backend chạy bằng IP Wi-Fi để app mobile truy cập, frontend web vẫn có thể dùng:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Nếu truy cập frontend từ máy khác trong cùng mạng, đổi sang IP máy chạy backend:

```env
VITE_API_BASE_URL=http://192.168.x.x:8080/api/v1
```

Sau khi sửa `.env`, cần dừng server Vite và chạy lại.

## 4. Chạy Ứng Dụng

```bash
npm run dev
```

Địa chỉ mặc định:

```text
http://localhost:5173
```

## 5. Build Kiểm Tra

```bash
npm run build
```

Kết quả build nằm trong `dist/`. Thư mục này không cần đưa vào file zip mã nguồn.

## 6. Chạy Test

```bash
npm run test
```

## 7. Các Thư Mục Quan Trọng

```text
src/
  api/              Cấu hình axios và các API endpoint.
  components/       Component dùng chung.
  features/         Các module nghiệp vụ như auth, exams, classes, grading.
  i18n/             File ngôn ngữ tiếng Việt và tiếng Anh.
  lib/              Hàm tiện ích.
  routes.tsx        Cấu hình route.
  styles/           CSS, Tailwind và theme.

public/             Tài nguyên tĩnh.
```

