# Yêu cầu xét duyệt danh tính và ngưỡng thử nghiệm

## Triển khai
1. Sao lưu database đang dùng.
2. Chạy `008_identity_appeals.sql` trên chính database BE kết nối (Neon trên production).
3. Ở Render **handsfree-face-worker**, đổi `FACE_COMPARE_THRESHOLD=0.32`, giữ nguyên shared key.
4. Deploy worker, BE và FE từ cùng commit mới. Không đổi encryption key.
5. Với hồ sơ đã lưu, bấm Xác minh hồ sơ để tính lại theo ngưỡng mới; không cần chụp lại các bước đã đạt.

PowerShell local (chạy tại BE):
```powershell
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_appeals.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_appeals.dump ./handsfree_before_appeals.dump
docker cp ./deployment/008_identity_appeals.sql handsfree-postgres:/tmp/008_identity_appeals.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/008_identity_appeals.sql'
```
Không commit file dump. Nếu worker local đang có container, tạo lại container với env threshold mới; chỉ restart không đổi env container.

## Luồng
- Ngưỡng 0.32 là thử nghiệm cho dự án môn học, không phải ngưỡng đã hiệu chỉnh trên tập dữ liệu CCCD. Giữ các kiểm tra motion/PAD, chất lượng, số giấy tờ và họ tên.
- Hồ sơ đủ ảnh nhưng chưa tự VERIFIED được lưu để USER gửi yêu cầu ADMIN xét duyệt từ trang `/face-comparison`.
- Chỉ một yêu cầu đang mở cho mỗi USER. Ảnh trong yêu cầu là bản sao mã hóa tại thời điểm gửi, không bị thay bằng ảnh của lần khác.
- Trong thời gian REQUESTED/PROCESSING, không thay thế checkpoint hoặc gửi lại hồ sơ. ADMIN nhận xử lý độc quyền; chủ claim được huỷ nhận để trả về REQUESTED.
- Duyệt / từ chối cần lý do; snapshot giữ lại để USER xem sau này. Duyệt hợp lệ xuất bản VERIFIED. Từ chối cho phép thực hiện lại phiên rồi gửi yêu cầu mới.
- Thông báo được lưu cùng giao dịch xử lý; WebSocket chỉ gửi sau commit. Link `/identity/requests/{id}` kiểm tra chủ tài khoản hoặc ADMIN. STAFF không xem ảnh/số CCCD.
- ADMIN: Hồ sơ xác thực → Yêu cầu USER gửi xét duyệt. Lọc trạng thái; tìm theo mã tài khoản / mã yêu cầu. Bộ quản lý hồ sơ hiện có vẫn dùng được.
- Ảnh dùng blob private, lớp phủ modal nền blur, zoom 1–5 lần, pan, pinch, X/Escape.
