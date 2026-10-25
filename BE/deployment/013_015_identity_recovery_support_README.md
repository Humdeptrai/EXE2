# Danh tính duy nhất, khôi phục mật khẩu, hỗ trợ và cộng ví

## Phạm vi

- Chặn một số CCCD đã xác nhận được dùng để tự xác minh tài khoản khác. HMAC tra cứu độc lập với ciphertext AES-GCM; không có API công khai tra tài khoản theo số CCCD.
- Đối chiếu vector SFace giữa tài khoản; nghi trùng mặt/ảnh chuyển REVIEW_REQUIRED, không tự khóa tài khoản cũ. Ngưỡng nghi vấn mặt là cấu hình riêng, không phải ngưỡng face–CCCD.
- ADMIN xem bằng chứng chính của hồ sơ liên quan, nhận xử lý yêu cầu rồi xác nhận chuyển quyền định danh nếu cần. Không chuyển ví, tiền, lịch sử matching; thu hồi trạng thái VERIFIED cũ và thông báo chủ cũ. Duyệt thủ công luôn lưu lý do.
- Khi hai mặt có số CCCD 12 chữ số đọc được rõ ràng nhưng mâu thuẫn, yêu cầu chụp lại mặt sau. Không xác thực chip/giấy tờ thật. QR/MRZ toàn diện và phát hiện Photoshop không được bảo đảm bởi worker RGB hiện tại.
- Quên mật khẩu qua email cho tài khoản USER có mật khẩu: token ngẫu nhiên 256 bit, DB chỉ lưu SHA-256; 15 phút, một lần; tối đa 3 email/giờ/tài khoản, cách nhau 60 giây; endpoint có giới hạn tổng 120 yêu cầu/phút/BE instance. Đáp ứng chung tránh công bố email có tồn tại. Tài khoản Google dùng Google; tài khoản chỉ có SĐT và chưa có email chưa có tự phục hồi bằng SMS trong phase này.
- Đổi mật khẩu tăng token_version, xóa refresh token; HTTP và WebSocket kiểm tra phiên bản. JWT cũ chưa có claim tương đương version 0; bị vô hiệu sau lần đổi mật khẩu đầu tiên.
- Báo lỗi hệ thống/nạp tiền dùng luồng SUPPORT hiện có. USER chỉ xem hồ sơ mình; STAFF/ADMIN phải nhận đơn mới được resolve/reject. ADMIN có thể hủy phân công rồi nhận lại, có audit. Thông báo kết quả liên kết đến chi tiết báo cáo.
- ADMIN cộng ví có xác nhận hai bước, lý do, UUID idempotency, audit và notification. STAFF không có quyền. Có mã đơn payOS: đối soát chứng từ trước, cộng đúng số tiền của đúng chủ đơn, đánh dấu cùng đơn đã được cộng; webhook/reconciliation sau đó không cộng lại. Không có mã đơn: sổ ví ghi ADMIN_CREDIT, không giả là tiền payOS hay doanh thu phí.

## Thứ tự deploy (backup trước)

1. Chạy `013_identity_registry.sql`, `014_password_reset.sql`, `015_admin_wallet_credit.sql` vào đúng DB backend đang sử dụng. Không thay dữ liệu hay cấu hình DB/JWT hiện tại.
2. Deploy face-worker bản mới trước (thêm private `/features`, vector và digest trong checkpoint finish).
3. Deploy BE và FE cùng phiên bản.
4. ADMIN mở `/admin/identities`, bấm **Lập chỉ mục danh tính cũ**, mỗi lượt tối đa 5 hồ sơ; lặp đến khi còn 0. Hồ sơ cũ không bị tự xóa/thu hồi. Nếu một ảnh cũ không đọc được, kiểm tra log và hồ sơ; luồng tự xác minh mới chuyển kiểm tra bổ sung khi chỉ mục chưa đầy đủ.
5. Kiểm tra số CCCD trùng trên hồ sơ cũ bằng công cụ đối chiếu. Trùng cũ không tự chọn người là chủ thật; ADMIN phải xử lý yêu cầu và xác nhận chuyển quyền.

PowerShell tại thư mục BE, DB Docker:

```powershell
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_identity_registry.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_identity_registry.dump ./handsfree_before_identity_registry.dump
# Lần lượt thay tên script bằng 013_identity_registry.sql, 014_password_reset.sql, 015_admin_wallet_credit.sql:
docker cp ./deployment/013_identity_registry.sql handsfree-postgres:/tmp/013_identity_registry.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/013_identity_registry.sql'
```

Neon: chọn đúng database/branch trong SQL Editor, chạy lần lượt nội dung ba script. Dùng DB_URL trên Render làm căn cứ, không suy ra từ DB local.

## Biến môi trường BE (không để vào FE)

```dotenv
# Giữ nguyên IDENTITY_ENCRYPTION_KEY; đổi key phải có kế hoạch re-encrypt/re-index.
# Ngưỡng nghi trùng mặt, chưa phải kết quả hiệu chỉnh bằng bộ dữ liệu đánh giá.
IDENTITY_DUPLICATE_FACE_THRESHOLD=0.55
BREVO_API_KEY=
MAIL_FROM=
PASSWORD_RESET_URL=https://handsfree-fe.vercel.app/reset-password
```

Local: `PASSWORD_RESET_URL=http://localhost:5173/reset-password`.

Email dùng HTTPS Brevo, không dùng SMTP (Render Free chặn cổng SMTP phổ biến). Tạo API key trong Brevo, xác thực địa chỉ người gửi và bật gửi transactional theo yêu cầu nhà cung cấp. `MAIL_FROM` là email người gửi đã xác thực. Theo dõi tình trạng gửi/hạn mức trong dashboard Brevo; không bật gói trả phí tự động. Tài liệu: https://developers.brevo.com/docs/send-a-transactional-email và https://render.com/docs/free .

Hàng đợi gửi mail trong bộ nhớ có giới hạn, không giữ khóa DB khi gọi bên ngoài. Nếu dịch vụ restart hoặc nhà cung cấp từ chối gửi, người dùng có thể yêu cầu lại sau 60 giây; chưa có durable email outbox. Log không chứa token, email người nhận, ảnh hay số CCCD. Fragment `#token=` tránh gửi token trong request tải trang; FE xóa fragment sau khi reset thành công. Không bật tracking link email với liên kết reset.

Không có key mới bắt buộc cho face-worker; giữ FACE_COMPARE_SHARED_KEY và cấu hình hiện tại. Không hạ FACE_COMPARE_THRESHOLD hoặc tiêu chuẩn PAD trong phase này.

## Các giới hạn cần biết

- Trùng khuôn mặt là tín hiệu nghi vấn, không kết luận gian lận, sinh đôi hay Photoshop.
- Hash ảnh chỉ bắt file đã chuẩn hóa giống hệt; crop/nén/chụp lại có thể đổi hash. Chặn chính dựa trên số CCCD và đối chiếu mặt.
- Tra cứu mặt hiện quét vector gọn trong DB dưới một khóa đăng ký; phù hợp quy mô nhỏ, chưa có benchmark hay vector index cho quy mô lớn. Không có cam kết số người đồng thời.
- Claim cũ được giữ khi thu hồi, khóa tài khoản hoặc đổi giấy tờ; không tự giải phóng để tạo tài khoản khác. Chuyển quyền cần ADMIN và yêu cầu đang được ADMIN đó xử lý; phải khớp chủ sở hữu/phiên bản claim ADMIN vừa xem. Nếu dữ liệu thay đổi, tải lại và kiểm tra trước khi xác nhận.
- Các matching đã trả phí và lịch sử giao dịch không bị thay đổi. Thu hồi danh tính chỉ ảnh hưởng điều kiện đăng/nhận việc mới và các quyền yêu cầu VERIFIED hiện có.

## Kiểm chứng triển khai

- Build FE: TypeScript + Vite.
- 13 kiểm tra tích hợp BE trong DB H2 ở chế độ PostgreSQL: tranh số CCCD đồng thời, trùng mặt, chuyển quyền có yêu cầu, xác nhận chuyển quyền bị cũ, quyền riêng tư, cộng ví idempotent, quyền STAFF, webhook đến sau, reset một lần/hết hạn và thu hồi HTTP/WebSocket, phân công báo cáo; cập nhật profile đồng thời không ghi đè số dư/mật khẩu.
- Worker: kiểm tra HMAC chống sửa checkpoint, ràng buộc hash bằng chứng, xuất vector đúng phiên bản, giữ nguyên phép lấy điểm thấp hơn và từ chối số hai mặt mâu thuẫn.
- Không có thử nghiệm sinh trắc học trên người thật/điện thoại hay benchmark tải Render ở bước này. Gửi email thật cần key/người gửi của môi trường deploy. H2 không thay thế kiểm tra migration trên bản sao PostgreSQL.
- Test kiểm chứng tạm thời không nằm trong gói source, theo yêu cầu không bổ sung file test.
