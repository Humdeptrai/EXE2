# Lưu từng bước xác minh

Chạy `007_identity_progress.sql` trên đúng database backend trước khi deploy backend phase này.

## PostgreSQL Docker / PowerShell

Từ thư mục `BE`:

```powershell
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_progress.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_progress.dump ./handsfree_before_progress.dump
docker cp ./deployment/007_identity_progress.sql handsfree-postgres:/tmp/007_identity_progress.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/007_identity_progress.sql'
```

Không commit file `.dump`. Với Neon, chọn đúng database/branch mà Render BE dùng, dán toàn bộ nội dung SQL vào SQL Editor và chạy.

## Deploy

1. Chạy migration trên production database.
2. Deploy `handsfree-face-worker`, rồi `handsfree-be`, rồi FE từ cùng commit main. Worker policy và BE đều dùng phiên bản 4; không để bản cũ/mới chạy lẫn lâu.
3. Giữ nguyên `IDENTITY_ENCRYPTION_KEY` và `FACE_COMPARE_SHARED_KEY`, không cần biến môi trường mới. Checkpoint được worker ký bằng shared key và BE mã hoá bằng encryption key. Thay key sẽ làm các checkpoint cũ không tiếp tục được.
4. Chạy BE trong IntelliJ sau khi local DB đã migration. Nếu worker local dùng Docker, build lại image và tạo lại container từ cấu hình hiện có để dùng code mới.

## Hành vi

- Quét: CENTER + 4 hướng ngẫu nhiên + CENTER. Có tối thiểu 6 mẫu PAD ở đầu/cuối, vẫn đối chiếu cùng người trên mọi khung hình.
- Quét chưa hoàn tất vẫn là phiên tạm 5 phút. Sau khi quét đạt, checkpoint được lưu trong bảng `identity_progress`, không còn phụ thuộc phiên RAM/worker cũ.
- Selfie, mặt trước, mặt sau lưu riêng; mặt lỗi cần chụp lại chính mặt đó. Các phần đã đạt có thể tiếp tục sau khi tải lại trang hoặc restart worker/BE.
- Kết quả cuối cùng vẫn cần selfie/PAD hợp lệ, hai mặt đọc được, số CCCD 12 chữ số và ngưỡng so khớp hiện tại; chỉ hoàn tất đủ mới VERIFIED.
- Giữ hồ sơ VERIFIED cũ và quyền kết nối/ảnh đối phương theo luồng hiện có. Tích xanh bước riêng không cấp quyền đăng/nhận việc.
- API ảnh tiến trình chỉ trả cho chủ tài khoản USER, kiểm tra server, no-store. Không trả checkpoint, dữ liệu nhận diện, hay entity DB cho FE.
- Các bước quét của những phiên trước khi deploy không thể khôi phục nếu chưa từng lưu vào DB. Các hồ sơ VERIFIED trước đó vẫn được nhận diện như hoàn tất.
