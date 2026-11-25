# Đăng ký bằng email và OTP do ADMIN cấu hình

## Triển khai

1. Chạy `019_registration_email_otp.sql` trên Neon trước khi deploy backend. Mặc định công tắc **tắt**, giữ khả năng đăng ký không xác thực email.
2. Backend dùng lại `BREVO_API_KEY`, `MAIL_FROM` và `app.jwt.secret` hiện có. Địa chỉ gửi cần được Brevo chấp nhận. Không cần cấu hình SMS.
3. Deploy backend rồi frontend cùng phiên bản. Vào **Admin → Cấu hình → Đăng ký & email** và lưu công tắc.
4. Khi bật, thử gửi OTP tới hộp thư thật, nhập mã và tạo tài khoản. Kiểm tra cả thư rác. Brevo nhận yêu cầu gửi không bảo đảm thư luôn vào hộp thư đến.

## Hành vi

- Đăng ký bằng mật khẩu chỉ nhận email; không nhận SĐT, kể cả gọi trực tiếp API. Email không bị giới hạn nhà cung cấp: Gmail và các email hợp lệ khác đều dùng được.
- **Bật**: user nhập email, bấm **Gửi mã OTP**, nhập mã rồi đăng ký. Chưa tạo user/JWT trước khi xác thực. Không thể bỏ qua bước OTP bằng cách gọi thẳng API đăng ký.
- **Tắt**: không hiển thị bước OTP, không gửi thư và không kiểm tra quyền truy cập hộp thư. Vẫn kiểm tra email đúng định dạng và không trùng tài khoản.
- Tài khoản cũ giữ nguyên. Đăng nhập bằng SĐT của tài khoản cũ vẫn hoạt động. Đăng nhập Google vẫn kiểm tra ID token và `email_verified=true` từ Google, không cần OTP riêng.
- Trang đăng ký tải cấu hình công khai trước khi cho gửi form, kiểm tra lại cấu hình khi đăng ký; backend luôn là nơi quyết định cuối cùng. Khi cấu hình chưa tải được, form có nút thử lại và không tự bỏ qua xác thực.
- Mã gồm 6 chữ số ngẫu nhiên, hiệu lực 10 phút, chỉ dùng một lần và chỉ cho đúng email đã yêu cầu (chuẩn hóa chữ thường). Gửi lại thay thế mã cũ. Đổi email trên form xóa mã đã nhập.
- Gửi lại tối thiểu 60 giây, tối đa 5 lần/giờ/email; giới hạn tổng 30 yêu cầu gửi/phút/instance để hạn chế gửi thư hàng loạt. Nhập sai 5 lần phải gửi lại mã mới. Những giới hạn theo email và số lần nhập sai nằm trong DB, không mất khi restart.
- Không lưu OTP dạng rõ; lưu HMAC với nonce theo lượt và khóa bí mật ứng dụng. Không ghi mã/người nhận vào log. Dọn challenge không được gửi trong 24 giờ mỗi giờ.
- Kiểm tra/tiêu thụ OTP và tạo user/JWT nằm cùng transaction; lỗi tạo tài khoản rollback việc tiêu thụ OTP. Lỗi OTP trả về sau khi commit số lần nhập sai. Khóa hàng theo email chặn gửi lại/xác thực đồng thời.
- Gửi thư có timeout 10 giây. Lỗi Brevo trả lỗi thân thiện và rollback lượt gửi mới; mã cũ chưa hết hạn vẫn giữ hiệu lực. Admin không thể bật nếu chưa khai báo cấu hình mail; lỗi quyền hạn/quota của Brevo vẫn có thể chỉ xuất hiện lúc gửi thử.
- ADMIN mới sửa được cấu hình; lưu nhật ký `REGISTRATION_EMAIL_SETTINGS`. Không thay đổi yêu cầu xác thực danh tính, matching hay thanh toán.

## API

- `GET /api/v1/auth/register/policy` → `result.emailOtpRequired`.
- `POST /api/v1/auth/register/email-otp` với `{ "email": "person@example.com" }` → thời gian hiệu lực và thời gian gửi lại.
- `POST /api/v1/auth/register` giữ trường `identifier` nhưng chỉ nhận email; thêm `emailOtp` khi bắt buộc. Vẫn cần `fullName`, `password`, `termsAccepted`.
- `PATCH /api/v1/admin/settings/registration-email` với `{ "registrationEmailOtpEnabled": true }`.

## Kiểm thử

- Frontend: build và `tests/registration-email.test.cjs` kiểm tra email-only, bật/tắt OTP, đổi email, lỗi gửi mã, cấu hình cũ, cấu hình lỗi và lưu từ admin.
- Backend: `bash mvnw -Dtest=RegistrationEmailHttpTest test`. Test sử dụng H2 và mail giả để kiểm tra API, phân quyền ADMIN/STAFF/USER, OTP, giới hạn, lượt nhập sai được commit, OTP hết hạn/đã dùng, lỗi gửi mail rollback và đăng ký khi tắt. Chỉ initializer `ON CONFLICT` được thay thế cho H2; các khóa/transaction dữ liệu dùng repository thật.
- Kiểm tra email thực tế sau deploy cần hộp thư nhận thật và Brevo hoạt động. OTP chứng minh quyền truy cập hộp thư, không xác minh danh tính thật hay chặn toàn bộ email tạm.
