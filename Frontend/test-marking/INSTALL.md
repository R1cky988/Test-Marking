# Cài Đặt FrontendWeb

FrontendWeb là giao diện web React/Vite cho giáo viên trong hệ thống TestMarking OMR.

## Yêu Cầu

- Node.js 20 trở lên.
- npm.
- Backend API đang chạy tại `http://localhost:8080/api/v1`.

Kiểm tra:

```bash
node -v
npm -v
```

## Cài Dependency

```bash
cd test-marking
npm install
```

Không commit `node_modules/`.

## Cấu Hình Môi Trường

Tạo `.env` từ file mẫu:

```bash
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Nội dung local thường dùng:

```env
VITE_APP_NAME=OMR Admin
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Nếu truy cập frontend từ máy khác trong cùng mạng LAN, đổi `VITE_API_BASE_URL` sang IP máy chạy backend:

```env
VITE_API_BASE_URL=http://192.168.x.x:8080/api/v1
```

Sau khi sửa `.env`, dừng server Vite và chạy lại.

## Chạy Ứng Dụng

```bash
npm run dev
```

Mở trình duyệt:

```text
http://localhost:5173
```

## Build Và Test

```bash
npm run build
npm run test
```

Kết quả build nằm trong `dist/`, không cần commit lên GitHub.

## Ghi Chú Git

Nên commit source code trong `src/`, tài nguyên tĩnh cần thiết trong `public/`, `package.json`, `package-lock.json`, `.env.example`, `README.md` và `INSTALL.md`.

Không commit `.env`, `.env.local`, `node_modules/`, `dist/`, cache Vite, log và tài liệu trong `docs/`.
