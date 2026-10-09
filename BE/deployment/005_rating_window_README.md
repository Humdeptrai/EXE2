# Thời gian công việc, rating hai vai trò và report đối tác

## Cập nhật database trước khi chạy backend mới

Migration `005_job_end_rating_window.sql` cần các migration trước đó (002–004). Chạy trên **từng database đang sử dụng**: Docker local và Neon production. Migration không tự chạy khi mở IntelliJ.

Neon: chọn đúng project/branch/database, mở SQL Editor, chạy toàn bộ nội dung `005_job_end_rating_window.sql`. Thành công sẽ kết thúc bằng `COMMIT`. Sau đó deploy backend mới trên Render. Frontend và backend phải cùng phiên bản.

Nếu Render báo `rating_delay_minutes ... contains null values` nhưng vẫn hiển thị Live, Hibernate đang cố thêm cột bắt buộc vào bảng đã có dữ liệu mà không có giá trị mặc định. Chạy lại bản migration 005 hiện tại trong Neon: script thêm cột với mặc định 360, điền các giá trị NULL và giữ nguyên thời gian ADMIN đã cấu hình. Sau đó chạy migration 006 cho phase report nếu chưa chạy. Chỉ khi các migration thành công, đặt `JPA_DDL_AUTO=validate` trong Environment của backend Render và redeploy để phát hiện schema thiếu ngay khi khởi động.

Docker local, PowerShell từ thư mục `BE`:

```powershell
docker start handsfree-postgres
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_rating.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_rating.dump ./handsfree_before_rating.dump
docker cp ./deployment/005_job_end_rating_window.sql handsfree-postgres:/tmp/005_job_end_rating_window.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/005_job_end_rating_window.sql'
```

Giữ bản backup riêng trên máy, không commit file `.dump`. Sau migration, chạy lại BE trong IntelliJ và cập nhật FE. Không cần thêm API key/env cho phase này.

## Quy tắc áp dụng

- Bài đăng mới và bài được sửa phải có ngày/giờ kết thúc dự kiến, sau ngày/giờ bắt đầu. Có thể kết thúc vào ngày hôm sau. Các giờ nhập theo múi giờ kinh doanh, mặc định Việt Nam.
- ADMIN vào trang cấu hình, chỉnh **Chờ mở đánh giá sau kết thúc (phút)**. Mặc định 360 phút (6 giờ), cho phép 0–43200 phút.
- Matching mới lưu riêng thời điểm kết thúc, mở rating và đóng rating. Cấu hình mới chỉ áp dụng cho matching tạo sau đó; sửa bài không đổi thời hạn của matching đã tạo.
- Rating mở tại `kết thúc dự kiến + thời gian chờ`, đóng sau 7 ngày kể từ lúc mở. Cả hai phải thanh toán đủ; mỗi bên gửi 1–5 sao và ghi chú tối đa 500 ký tự, một lần/matching.
- Popup xuất hiện khi người dùng đang trong ứng dụng, kiểm tra mỗi phút và khi quay lại tab. Không thể hiện popup nếu đã đóng ứng dụng. Chọn **Để sau** tắt nhắc cho riêng người đó/matching; vẫn đánh giá từ matching, ứng viên hoặc bài đăng trong thời hạn.
- Uy tín thuê việc và nhận việc tính riêng bằng trung bình các đánh giá đúng vai trò; hiển thị số đánh giá. Chưa có đánh giá không được hiểu là điểm 0.
- Report đối tác trong matching yêu cầu hai chiều đã trả phí. Hỗ trợ tài khoản/thanh toán vẫn gửi được trước khi trả đủ; báo cáo vi phạm bài đăng/người dùng giữ luồng hiện có.
- Matching cũ chưa có mốc rating giữ quy tắc cũ (bắt đầu + 1 giờ), không tự thêm hạn mới. Bài cũ thiếu kết thúc cần bổ sung trước khi tạo matching mới; không tự suy đoán thời gian kết thúc.

## Kiểm tra sau deploy

Với hai tài khoản USER đã đủ điều kiện, tạo bài có kết thúc dự kiến, nhận ứng viên, kiểm tra trạng thái chờ thanh toán. Thanh toán từng bên rồi kiểm tra mở liên hệ/report. Kiểm tra rating trước giờ mở, trong thời hạn và sau hạn; để sau rồi quay lại rating từ bài/ứng viên/matching. Xác nhận đánh giá của người thuê chỉ tăng uy tín nhận việc và đánh giá của người nhận việc chỉ tăng uy tín thuê việc.
