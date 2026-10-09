# Báo cáo: bằng chứng, nhận xử lý và thông báo kết quả

## Cập nhật database

Chạy `006_report_evidence_assignment.sql` sau các migration 002–005, trên Docker local và Neon production, trước khi chạy backend mới. Trên Neon, chọn đúng database và chạy toàn bộ file trong SQL Editor, kết thúc bằng `COMMIT`.

PowerShell từ thư mục `BE`:

```powershell
docker start handsfree-postgres
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_report.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_report.dump ./handsfree_before_report.dump
docker cp ./deployment/006_report_evidence_assignment.sql handsfree-postgres:/tmp/006_report_evidence_assignment.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/006_report_evidence_assignment.sql'
```

Giữ backup riêng, không commit file `.dump`. Sau migration, deploy BE và FE mới. Migration bổ sung phân công, bằng chứng, link và cập nhật check constraint loại thông báo. Case `IN_REVIEW` cũ chưa có người nhận sẽ trở về `OPEN` để có thể nhận lại; report đã kết thúc giữ nguyên kết quả.

## Lưu trữ và giới hạn

- Ảnh/video/link đều tùy chọn. Tối đa 5 ảnh JPEG/PNG/WebP, mỗi ảnh 5 MB; 1 video MP4 tối đa 100 MB; 5 link HTTP/HTTPS, mỗi link tối đa 2.000 ký tự.
- Dùng cấu hình storage hiện có. Local lưu bằng chứng ở thư mục `report-evidence`, cùng cấp với thư mục ảnh bài đăng, không được phục vụ qua URL public.
- Production Render nên dùng `STORAGE_PROVIDER=cloudinary` và các khóa Cloudinary hiện có. Bằng chứng dùng delivery type `authenticated`; video upload theo từng chunk. Không có khóa mới dành riêng cho report. Tài khoản Cloudinary phải cho phép lưu video với dung lượng cần dùng.
- Client chỉ nhận API `/api/v1/reports/{id}/evidence/{evidenceId}`. Backend kiểm tra chủ report hoặc ADMIN/STAFF rồi stream file. URL Cloudinary có chữ ký không được trả cho client. Video chỉ tải khi bấm xem để tránh tự tải 100 MB trên điện thoại.
- Backend mặc định multipart tối đa 100 MB/tệp, 130 MB/request; giới hạn riêng của ảnh bài đăng/avatar/xác minh vẫn được kiểm tra bởi service hiện có. Nếu deployment đang đặt giới hạn riêng thấp hơn, cần cập nhật `MULTIPART_MAX_FILE_SIZE=100MB`, `MULTIPART_MAX_REQUEST_SIZE=130MB` và kiểm tra giới hạn request/timeout của proxy trước backend.
- Link được hiển thị để mở ở tab mới; backend không tự truy cập link hoặc tạo preview.

## Quyền và luồng xử lý

- USER gửi report từ `/reports`, xem chi tiết tại `/reports/{reportId}` và chỉ xem được report/bằng chứng của mình.
- Report đối tác matching vẫn cần đủ phí hai chiều; báo cáo bài/người dùng và hỗ trợ thanh toán giữ điều kiện của phase trước.
- ADMIN và STAFF xem danh sách/bằng chứng tại `/admin/reports`, `/staff/reports`.
- Nhận xử lý: khóa dòng report trong transaction, chuyển `OPEN` → `IN_REVIEW`, lưu người nhận và thời điểm. Hai STAFF cùng nhận thì chỉ một người thành công.
- STAFF chỉ hủy hoặc resolve/reject case mình đã nhận. Hủy trả về `OPEN`, xóa phân công, không gửi thông báo kết quả.
- ADMIN có thể resolve/reject hoặc hủy phân công của case đang được nhận. Nhận một case do người khác nhận vẫn bị từ chối; quyền can thiệp nằm ở thao tác hủy/kết thúc và được ghi nhật ký.
- Resolve/reject cần phản hồi tối đa 2.000 ký tự. Case kết thúc không được đổi trạng thái tiếp. Lưu kết quả, người xử lý, thời điểm, nhật ký và thông báo trong cùng transaction; chỉ phát WebSocket sau commit.
- USER bấm thông báo sẽ mở đúng report, xem toàn bộ nội dung/phản hồi/bằng chứng, kể cả report không nằm ở trang đầu của danh sách.
- Danh sách quản trị tự làm mới mỗi 15 giây khi đang mở; khóa tại BE bảo vệ ngay cả khi màn hình STAFF khác chưa kịp cập nhật.

## API

- `POST /api/v1/reports`: JSON nếu không có file; multipart gồm part `report` (JSON) và nhiều part `files` nếu có bằng chứng.
- `GET /api/v1/reports/mine`, `GET /api/v1/reports/{id}`: danh sách cá nhân và chi tiết có kiểm tra quyền.
- `GET /api/v1/staff/reports`: danh sách quản trị.
- `POST /api/v1/staff/reports/{id}/claim`, `POST /api/v1/staff/reports/{id}/release`: nhận/hủy nhận.
- `PATCH /api/v1/staff/reports/{id}`: `{ "status": "RESOLVED" | "REJECTED", "resolution": "..." }`.

Kiểm tra sau deploy: USER gửi report có ảnh/video/link, hai STAFF cùng nhận, người không sở hữu thử xử lý, hủy rồi nhận lại, resolve/reject và bấm thông báo ở USER. Xác nhận USER khác không mở được report hoặc file. Cần kiểm tra một video thật 100 MB trên storage/proxy production vì build local không xác nhận được giới hạn tài khoản Cloudinary và mạng Render.
