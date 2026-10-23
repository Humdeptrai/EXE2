# Tối ưu hồ sơ và ảnh chat

## Các thay đổi

- `GET /api/v1/identity/progress/profile`: trả eligibility, thông tin cá nhân xác minh và tiến trình trong một request. Controller gọi IdentityProgressService interface; implementation tái sử dụng IdentityService interface.
- Các API trạng thái dùng projection: chỉ đọc trường nhỏ và cờ có ảnh, không lấy bytea ảnh/checkpoint/OCR lớn. API ảnh đọc đúng một ảnh mã hóa rồi giải mã; schema và cơ chế mã hóa giữ nguyên.
- Giao diện hồ sơ chờ dữ liệu trước khi kết luận đã/chưa xác minh hoặc hiển thị phần trăm. Các mục kiểm tra tương ứng đúng với 13 mục tính điểm. Đổi tài khoản khởi tạo lại toàn bộ trạng thái trang.
- Ảnh chỉ tải khi đến gần vùng xem. Request trùng được gộp. Blob đã tải được giữ trong bộ nhớ tab tối đa 16 MiB / 24 tệp, TTL 2 phút, chỉ cho ảnh có phiên bản và tệp chat/ảnh yêu cầu xét duyệt bất biến. Không lưu dữ liệu riêng tư trong localStorage hoặc service worker. Đăng xuất/đổi phiên xóa cache và hủy request đang chạy; ảnh có phiên bản mới dùng cache key mới.
- Download ảnh chat đọc metadata cùng điều kiện tham gia, thanh toán WALLET hai chiều, hai bút toán CONNECT, trạng thái không EXPIRED và thời điểm mở chat/kết nối trong một truy vấn. Kiểm tra tài khoản còn hoạt động trước truy vấn. Đọc ảnh vẫn qua API có xác thực; không công khai URL storage.
- Upload Cloudinary dùng upload thường cho tệp đến 20 MiB; tệp lớn vẫn upload theo chunk. Giữ ảnh gốc, tỷ lệ, định dạng, quyền authenticated, giới hạn tệp và cơ chế chống gửi trùng/cleanup.
- WebSocket tiếp tục cập nhật ngay. Đối soát tin nhắn/unread khi socket kết nối giảm từ 15 giây xuống 60 giây, khi mất kết nối vẫn 15 giây; chuyển lại tab và reconnect vẫn làm mới. Chặn các lượt poll chồng nhau và không đánh dấu đã đọc lại khi không có tin chưa đọc.
- Các trang dùng lazy import; shell giữ nguyên khi trang con đang tải. Build file JS chính giảm từ khoảng 739 KB / 210 KB gzip xuống 338 KB / 107 KB gzip. Đây là số liệu build, không phải cam kết thời gian mạng thực tế.

## Triển khai và đo lại

1. Deploy BE từ commit này trước, chờ live, sau đó deploy FE. Không cần migration, env mới hay redeploy face-worker.
2. Mở lại/cập nhật PWA để dùng FE mới. Đo mở hồ sơ và gửi/tải cùng ảnh đã dùng trước đó.
3. Render BE Logs lọc `HF_PERF`. So sánh `identity.profile`, `identity.active.read`, `progress.row.read`, `identity.image.read`, `chat.download.authorize.transaction`, `chat.storage.upload` và `http.total`.
4. Các API cũ vẫn hoạt động. Log vẫn bật theo PERFORMANCE_TRACE_ENABLED; có thể tắt sau khi đo xong.

Thời gian upload/mở luồng storage còn phụ thuộc Cloudinary, vị trí dịch vụ và mạng. Bản này giảm dữ liệu/truy vấn và các lần tải lại; chưa có số đo sau deploy nên không đưa ra mục tiêu mili giây đã đạt. Với ảnh tải lần đầu, đường truyền BE ↔ storage vẫn cần đo tiếp nếu còn chậm.

## Kiểm tra

- Build Java 21 và production FE.
- Chạy kiểm tra tạm trên H2 PostgreSQL mode: khởi tạo repository/JPA, kiểm tra SQL projection, cờ tiến trình và đọc riêng ảnh; hồ sơ active/draft, API hồ sơ tổng hợp, điều kiện truy cập ảnh chat gồm người lạ, sai conversation, chưa trả đủ phí, thiếu ledger, hết hạn, lịch sử đã hoàn thành và chat chưa mở.
- Chạy kiểm tra cache bằng Node: gộp request trùng, đổi phiên bản, cách ly phiên/đăng xuất, hủy request cũ, hết TTL.
- Các kiểm tra cục bộ không thay thế số đo Render/Neon/Cloudinary. Chưa kiểm chứng UI bằng thiết bị iPhone thực tế.

## Sửa vị trí chat và ảnh sau refresh

- Chat dùng layout effect sau khi lịch sử thực sự xuất hiện, cuộn đúng viewport chat thay vì scrollIntoView trên toàn trang.
- ResizeObserver theo dõi vùng tin nhắn/viewport. Khi đang ở cuối, ảnh/video decode hoặc composer đổi chiều cao vẫn giữ tin cuối trong tầm nhìn. Khi người dùng cuộn lên đọc, giữ neo vào tin đang xem; tải lịch sử cũ không nhảy tới cuối. Không cập nhật React state theo từng nhịp scroll.
- Ưu tiên tải ảnh thuộc 3 tin cuối; ảnh xa vùng xem vẫn lazy-load. Có khung chờ ảnh thay cho nút tên tệp làm chiều cao thay đổi đột ngột.
- Ảnh chat có ETag và `Cache-Control: private, no-cache`, `Vary: Authorization`. Trình duyệt có thể giữ ảnh qua refresh nhưng phải kiểm tra lại với BE. BE kiểm tra tài khoản/quyền tham gia/thanh toán/ledger trước khi trả 304; nếu trùng phiên bản thì không mở lại luồng Cloudinary. PDF/video/tệp khác vẫn no-store; ảnh xác minh/CCCD ở các API xác minh vẫn no-store. Không cache API trong service worker.
- Ảnh cũ tải trước bản này chưa có cache HTTP; cần một lần tải thành công bằng bản mới. Browser có thể xóa cache; tải lần đầu vẫn phụ thuộc storage/mạng. Khi kiểm tra cache ấm, tắt tùy chọn Disable cache của DevTools; đo cache lạnh riêng.
- Kiểm tra tạm: React + DOM giả lập hình học cho refresh, ảnh thay đổi chiều cao, đọc lịch sử, thêm trang cũ, gửi mới và resize; Spring MockMvc với security cache header writer cho 200/304, ETag yếu/danh sách, kiểm tra quyền trên request cache, tài khoản bị khóa và no-store của tệp khác. Chưa xác nhận bằng iPhone thực tế.
