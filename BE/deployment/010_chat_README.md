# Chat: tin chưa đọc, online, emoji, thả tim và tệp riêng tư

1. Sao lưu DB và chạy `010_chat_media_presence.sql` trong Neon database BE đang dùng; local Docker cũng chạy cùng script. Không sửa lịch sử tin nhắn.
2. Deploy BE và FE cùng commit. Không cần face-worker.
3. Trên Render dùng `STORAGE_PROVIDER=cloudinary` và cấu hình Cloudinary hiện có. Tệp chat là authenticated, chỉ hai người trong cuộc trò chuyện tải qua API BE; không xuất URL Cloudinary lên FE. Local dùng provider local; folder chat-attachments nằm cạnh thư mục public jobs, không được serve công khai. Render không có disk bền vững thì không dùng local cho tệp thật.
4. Không cần env mới. Giới hạn: một tệp/tin; ảnh JPG/PNG/WebP 10 MiB, MP4 50 MiB, PDF/TXT 10 MiB. Multipart hiện mặc định 100/130 MB nên đủ. Nếu đã tùy chỉnh env, max-file-size phải >=50MB và max-request-size phải đủ phần multipart.

Tin nhắn mới không tạo thông báo chuông. Các thông báo CHAT_MESSAGE_RECEIVED cũ được bỏ khỏi API danh sách và số chưa đọc; bản ghi cũ vẫn giữ. Badge Tin nhắn đếm tin chưa đọc toàn bộ cuộc trò chuyện. Chỉ đánh dấu đã đọc khi mở đúng phòng, trang hiển thị và cửa sổ đang được focus. Đọc đồng bộ các tab qua READ event; reconnect/focus/polling tải lại số chưa đọc.

Online lấy từ session đăng ký kênh chat, có heartbeat 10 giây, nhiều tab được tính chung (đóng một tab không khiến cả account offline). Dấu xanh thuộc đối phương, không phải trạng thái socket của chính mình. Online chỉ chia sẻ cho những người đã có cuộc trò chuyện được mở sau trả phí. In-memory presence/simple broker tương ứng với BE một instance hiện tại; nhiều instance cần broker/presence dùng chung trước khi scale.

Thả tim đặt/bỏ theo desired boolean, một tim/user/tin; áp dụng tin của mình và đối phương. Gửi tin qua HTTP để nhận xác nhận lưu; realtime gửi tới hai bên sau commit. Retry giữ clientMessageId nếu draft không đổi để tránh tin/tệp trùng. Tin chưa gửi giữ text/tệp khi request lỗi. Emoji lưu như nội dung Unicode.

Ảnh có xem lớn/zoom, video bấm để tải và phát, tệp PDF/TXT tải xuống. Mỗi request media xác thực tài khoản và quyền phòng; kiểm tra MIME/header/size phía BE. Cloudinary upload có chunking; lỗi transaction dọn asset. Media FE dùng blob có Authorization, revoke object URL khi rời trang. Video dùng blob 50MB tối đa, không phải streaming theo Range.

Countdown hiển thị ở thẻ matching và trang phí kết nối, dùng paymentDeadlineAt đã lưu trên BE theo payment_window_minutes của ADMIN, không hardcode 24h. Có hiển thị ngày nếu hạn dài hơn 24h. Đồng hồ dùng serverTime để hạn chế sai giờ máy. Countdown dừng khi hai bên trả đủ; khi về 0, trang phí tải lại trạng thái, BE vẫn quyết định hết hạn/hoàn phí. Thay cấu hình ADMIN áp dụng cho matching mới theo nghiệp vụ snapshot hiện có.
