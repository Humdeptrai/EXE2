# Admin điều chỉnh lịch bài đăng và matching

## Triển khai

1. Chạy `018_admin_match_schedule.sql` trên đúng database Neon đang dùng trước khi deploy backend. Script chỉ mở rộng CHECK constraint cho loại thông báo mới; không sửa lịch hay dữ liệu thanh toán.
2. Deploy backend và frontend cùng phiên bản. Không cần thêm biến môi trường.
3. Đăng nhập ADMIN → Kết nối → Chỉnh lịch. Chọn ngày/giờ bắt đầu, kết thúc và ghi lý do. Kiểm tra thông báo phạm vi toàn bộ matching trước khi lưu.

## Phạm vi nghiệp vụ

- Danh sách Kết nối có phân trang, tìm kiếm và lọc; hiển thị lịch hiện tại của bài đăng. Chỉnh lịch áp dụng cho bài đăng và tất cả matching thuộc bài, kể cả matching đã kết thúc.
- Cho phép lùi ngày về quá khứ. Kết thúc phải sau bắt đầu. Thời gian nhập theo múi giờ nghiệp vụ, mặc định Việt Nam (UTC+7).
- Mốc mở/đóng đánh giá dịch theo ngày kết thúc mới; giữ thời gian chờ và độ dài cửa sổ đã lưu của từng matching. Bản ghi cũ thiếu các mốc này dùng cấu hình thời gian chờ hiện tại và cửa sổ 7 ngày. Xóa trạng thái ẩn nhắc đánh giá để nhắc lại theo lịch mới. Các đánh giá đã gửi được giữ nguyên. Lùi ngày có thể làm cửa sổ đánh giá hết hạn.
- Không sửa ngày tạo bài, thời điểm accept/kết nối thành công, trạng thái, phí hoặc hạn thanh toán. Đây là chỉnh lịch thực hiện công việc.
- Mỗi người liên quan nhận một thông báo lịch mới. Chủ bài có nhiều người nhận việc vẫn chỉ nhận một thông báo. Thông báo dẫn đến trang matching hoặc thanh toán theo quyền truy cập hiện tại.
- Lý do, người sửa, lịch trước/sau và số matching được lưu tại Nhật ký với thao tác `MATCH_SCHEDULE_CHANGE`. Lý do chỉ hiển thị trong nhật ký quản trị.
- Backend yêu cầu ADMIN. Khóa bài đăng rồi khóa các matching để tránh thêm matching chen giữa hoặc ghi đè trạng thái thanh toán đồng thời. `expectedUpdatedAt` chặn form cũ ghi đè lịch mới; khi xung đột, admin tải lại lịch rồi nhập lý do và lưu lại.

## API

- `GET /api/v1/admin/matches/{matchId}/schedule`: lịch bài đăng, múi giờ, số matching và phiên bản `updatedAt`.
- `PATCH /api/v1/admin/matches/{matchId}/schedule`: `{ "startAt": "2025-12-01T08:00:00", "endAt": "2025-12-02T08:00:00", "expectedUpdatedAt": "<updatedAt từ GET>", "reason": "Lý do chỉnh lịch" }`.
- HTTP 409, code `40935`: lịch hoặc bài đăng đã thay đổi từ khi mở form. Mọi thay đổi lịch, matching, nhật ký và thông báo được ghi cùng transaction.

## Kiểm chứng

- Frontend: `npm run build`; `tests/admin-match-schedule.test.cjs` kiểm tra áp dụng toàn bộ matching, ngày quá khứ, khoảng thời gian không hợp lệ, chống gửi lặp và tải lại sau xung đột.
- Backend: `bash mvnw -Dtest=AdminMatchScheduleTest test`; kiểm tra cập nhật nhiều matching, giữ phí/hạn thanh toán/lịch sử, thời điểm đánh giá, thông báo không trùng, dữ liệu cũ/xung đột và chặn truy cập.
- Cần kiểm tra sau deploy trên tài khoản ADMIN và USER: đổi lịch bài có ít nhất hai matching, đối chiếu lịch của hai phía và thông báo; thử hai form mở cùng lúc. Kiểm tra USER/STAFF bị từ chối endpoint admin.
