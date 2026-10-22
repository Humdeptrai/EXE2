# Đo thời gian hồ sơ và ảnh chat

Deploy BE một lần để bật log `HF_PERF` (mặc định bật). Không cần migration hay deploy face-worker. Bản sửa giao diện mobile cần deploy FE riêng.

1. Render → handsfree-be → Logs → lọc `HF_PERF`.
2. Mở hồ sơ, chờ ảnh tải xong. Gửi một ảnh nhỏ trong cuộc trò chuyện đã mở khóa sẵn. Không cần xác minh lại, tạo matching mới hay người nhận online để đo upload.
3. Lấy các dòng cùng `requestId`; ID cũng có trong response header `X-Performance-Request-Id` ở DevTools → Network → Headers.
4. So sánh 3 lần cùng thao tác, ghi kích thước ảnh và thời điểm. Tách lần đầu đánh thức dịch vụ khỏi những lần sau.

| Stage | Đo gì |
| --- | --- |
| identity.*.read / progress.*.read | Đọc hồ sơ/ảnh từ repository; có thể gồm dữ liệu ảnh lớn |
| identity.account / progress.account | Kiểm tra tài khoản |
| *.decrypt | Giải mã ảnh |
| chat.validate | Kiểm tra tệp |
| chat.authorize.transaction | Kiểm tra quyền và trùng yêu cầu trước upload |
| chat.storage.upload | Lưu tệp, gồm upload lên storage đang cấu hình |
| chat.persist.transaction | Ghi tin nhắn, commit và callback sau commit |
| chat.event.publish | Gửi sự kiện tới bộ xử lý WebSocket phía server |
| chat.download.authorize.transaction | Kiểm tra quyền và đọc metadata ảnh chat |
| chat.storage.open | Mở luồng đọc storage, chưa phải toàn bộ thời gian tải ảnh |
| http.total | Tổng thời gian xử lý request phía BE, kèm HTTP status |

Các stage lồng nhau, **không cộng tất cả**: progress.identity.read chứa identity.*; chat.persist.transaction chứa chat.event.publish. Repository timing không tách riêng từng SQL hoặc pool wait. WebSocket timing không chứng minh thiết bị đối phương đã nhận tin. http.total không đo toàn bộ đường mạng tới thiết bị; so với Timing/TTFB trong browser để tìm phần chênh lệch. Request bị xử lý lỗi vẫn có HTTP status; outcome=completed chỉ nghĩa filter chain hoàn tất.

Log không ghi nội dung tin nhắn, URL có ID, tên tệp, dữ liệu CCCD, ảnh hoặc token. Chỉ các endpoint GET hồ sơ/ảnh cá nhân, POST multipart tin nhắn và GET attachment chat được theo dõi. Tắt bằng `PERFORMANCE_TRACE_ENABLED=false` khi đo xong; thay đổi env cần restart/deploy BE theo nền tảng. Không bật SQL parameter logging để đo vấn đề này.
