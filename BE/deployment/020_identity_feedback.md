# Thông báo và kết quả xác minh danh tính

Chạy `020_identity_feedback.sql` trên Neon trước khi deploy BE, rồi deploy FE cùng phiên bản. Script thêm `identity_progress.outcome_reason` và mở rộng loại thông báo; không xóa hồ sơ, không thay chủ định danh và không thay ngưỡng nhận diện.

## Kết quả xác minh

- Trùng CCCD, trùng mặt, trùng cả hai có nội dung riêng. Trùng ảnh giấy tờ, thay đổi khuôn mặt của chính tài khoản, thiếu dữ liệu đối chiếu, ảnh/OCR/selfie chưa đạt, và dịch vụ chưa sẵn sàng có lý do cùng hướng xử lý.
- Kết quả/ảnh không hợp lệ vẫn không được duyệt tự động. Không dùng dữ liệu thiếu hoặc phản hồi worker không hợp lệ để tạo hồ sơ VERIFIED.
- Sửa lỗi sao chép lý do: trạng thái user dùng lý do thật của hồ sơ chờ duyệt, thay vì thông điệp thành công từ bước so khớp trước đó.
- Lưu kết quả thất bại của bước kiểm tra selfie/CCCD và lần hoàn tất đối chiếu vào progress, kể cả khi chưa tạo được hồ sơ gửi duyệt. Không tạo một thông báo cho mỗi frame camera; thông báo cho kết quả bước/lần xác minh.
- Từ chối trực tiếp trong danh sách hồ sơ luôn thông báo user, kể cả không có appeal. Phê duyệt cũng thông báo. Appeal được cập nhật nếu có; thông báo được gửi một lần ngoài nhánh điều kiện appeal.
- Trường hợp đang có bản đã xác minh, từ chối bản cập nhật không thu hồi bản đã xác minh. Profile vẫn hiện rõ lý do từ chối bản mới.

## UI và chuông

Có 6 loại thông báo mới với biểu tượng và màu riêng: trùng CCCD, trùng mặt, trùng cả hai, cần xử lý bổ sung, admin từ chối, đã xác minh. Bấm dẫn tới profile. Trang hồ sơ hiển thị banner kết quả và lý do, liên kết thực hiện lại/gửi yêu cầu xét duyệt, và giải thích dấu tích xanh chỉ là bước/ảnh đã lưu. Không hiển thị thông tin của tài khoản bị trùng hoặc điểm so khớp sinh trắc học trong thông báo.

Profile cập nhật khi nhận realtime identity notification, khi quay lại tab và mỗi 30 giây khi trang đang hiển thị. Chuông dùng notification persistence và WebSocket sau commit sẵn có. Thông báo giống hệt trong 60 giây được gộp để tránh spam khi retry.

Hồ sơ cũ dùng trạng thái/lý do hiện có làm fallback; không tự phát hàng loạt thông báo cũ sau deploy. Các bước nhập liệu chưa hợp lệ/phiên không còn quyền truy cập vẫn giữ cơ chế báo lỗi API hiện có.

## Kiểm thử

`IdentityFeedbackTest`, `ManualIdentityReviewTest`, `IdentityFrontNameTest`: phân loại thông báo, đích đến, gộp retry, từ chối không có appeal, giữ hồ sơ VERIFIED cũ và lý do trùng được trả đúng.

`FE/tests/identity-outcome.test.cjs`: 6 kiểu biểu tượng/màu, lý do cụ thể, trạng thái từ chối, giữ bản VERIFIED cũ và link thông báo. Kiểm tra thêm bell, photo upload, audit, admin configuration và thông báo lỗi dùng các test hiện có.

Sau deploy, dùng hai tài khoản thử trùng CCCD/mặt, kiểm tra banner và chuông; từ chối một hồ sơ không có appeal và kiểm tra cả khi user đang mở profile lẫn tải lại trang.
