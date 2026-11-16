# Tải ảnh khuôn mặt do ADMIN bật/tắt

ADMIN mở **Cài đặt → Xác minh danh tính → Cho phép tải ảnh khuôn mặt**, sau đó
bấm **Lưu phương thức xác minh**. Công tắc mặc định tắt. Cấu hình này được lưu
riêng, không thay phí kết nối hay các thiết lập ví đang chỉnh sửa.

Khi bật, người dùng có thể chọn JPG/PNG/WebP thay bước quét động tác. Ảnh được
chuẩn hóa sang JPEG; backend kiểm tra kích thước/dung lượng và worker yêu cầu
một khuôn mặt. Sau đó vẫn cần selfie trực tiếp (so khớp, chất lượng và PAD),
lưu CCCD hai mặt và gửi yêu cầu ADMIN xét duyệt. Không có xác minh tự động cho
hồ sơ bắt đầu bằng ảnh tải lên, kể cả khi người dùng gọi trực tiếp API finish.

Khi tắt, giao diện chỉ cung cấp camera cho bước đầu và backend từ chối tải ảnh
mới. Tiến trình ảnh chưa gửi duyệt không thể tiếp tục selfie/CCCD/gửi mới; người
dùng cần quét trực tiếp. Hồ sơ đã gửi ADMIN và danh tính đã duyệt được giữ lại.
Luồng quét trực tiếp cũ vẫn có sáu bước và các ngưỡng PAD/so khớp ban đầu.

## Hợp đồng và quyền

- `PATCH /api/v1/admin/settings/identity`, body
  `{ "facePhotoUploadEnabled": true }`: chỉ ADMIN, ghi nhật ký thay đổi.
- `GET /api/v1/identity/progress/options`: trả cờ cho người dùng; không công khai
  cấu hình phí hoặc thông tin nội bộ khác.
- `POST /api/v1/identity/progress/face-photo?consent=true`: multipart `face`.
  Kiểm tra lại quyền/công tắc ở backend, không dựa vào việc ẩn nút trên FE.
- Progress thêm `facePhotoUploaded`; ảnh tải lên có `scanPassed=false`, kể cả
  sau khi duyệt. Giao diện dùng nhãn ảnh tải lên thay vì báo đã quét động tác.
- Checkpoint `PHOTO_UPLOAD` có `total=0`, `pad=[]`, HMAC thật và không giả lập
  sáu bước quét. Checkpoint LIVE_SCAN cũ không đổi; selfie dùng cùng bộ kiểm tra.
- Hồ sơ gửi xét duyệt lưu nguồn `PHOTO_UPLOAD`, `motionPassed=false` và
  `live=false`. ADMIN vẫn dùng luồng review cũ để xem ảnh và quyết định duyệt.
- Mã lỗi: `40362` chức năng đã tắt; `40962` cần ADMIN duyệt; `42262` ảnh chưa
  nhận rõ một khuôn mặt. FE có thông báo tiếng Việt tương ứng.

## Triển khai

1. Chạy `BE/deployment/016_identity_photo_upload.sql` trên Neon trước khi deploy
   BE. Script thêm hai cột boolean mặc định FALSE, chạy lại được, không xóa dữ liệu.
2. Deploy worker, BE và FE cùng bản thay đổi. Không cần thêm model hoặc khóa mới.
3. Công tắc vẫn tắt cho đến khi ADMIN chủ động bật và lưu.

Không bật công tắc nếu worker/BE/FE chưa được triển khai đủ. Nếu tắt lại thì các
đường upload mới bị chặn, trong khi hồ sơ đã duyệt không bị thu hồi.

## Kiểm tra

- Worker: `python -m unittest discover -s tests -v` tại `face-worker`.
- Backend: `IdentityPhotoUploadHttpTest`, `ManualIdentityReviewTest`,
  `ManualIdentityReviewHttpTest`, `IdentityFrontNameTest` dùng dữ liệu giả/H2.
- FE: `npm run build`; chạy `tests/face-photo.test.cjs`, `tests/user-errors.test.cjs`,
  `tests/profile-save.test.cjs` với ESBUILD_MODULE/JSDOM_MODULE như các test hiện có.
