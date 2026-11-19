# Đổi mật khẩu khi đã đăng nhập

Người dùng mở **Hồ sơ → Bảo mật tài khoản → Đổi mật khẩu**, nhập mật khẩu hiện tại, mật khẩu mới và xác nhận. Có thể hiện/ẩn mật khẩu hoặc hủy để xóa các giá trị đã nhập. Đổi thành công sẽ xóa phiên cục bộ và về trang đăng nhập với thông báo thành công.

## API

`POST /api/v1/users/me/password` — yêu cầu Bearer access token của tài khoản USER đang hoạt động.

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

Mật khẩu mới phải khác mật khẩu hiện tại, dài 8–72 ký tự, gồm chữ và số, và không vượt quá 72 byte UTF-8 do giới hạn BCrypt. Xác nhận mật khẩu được kiểm tra trên giao diện; server xác thực mật khẩu hiện tại và toàn bộ quy tắc mật khẩu mới.

Thành công: HTTP 200, `ApiResponse` có `result: null`. Server mã hóa mật khẩu bằng BCrypt, tăng `users.token_version`, xóa refresh token và vô hiệu hóa các liên kết đặt lại mật khẩu chưa dùng, trong cùng transaction. Token cũ bị từ chối bởi kiểm tra phiên hiện có. Việc kiểm tra phiên và đổi mật khẩu giữ khóa hàng user như luồng reset/refresh.

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | 40099 | Sai mật khẩu hiện tại |
| 409 | 40999 | Mật khẩu mới trùng mật khẩu hiện tại |
| 403 | 40399 | Tài khoản chỉ dùng Google, chưa có mật khẩu cục bộ |
| 422 | 42299 | Mật khẩu mới vượt giới hạn byte hoặc không hợp lệ |
| 429 | 42999 | Vượt 5 lần thử trong cửa sổ 60 giây trên một instance |

Dữ liệu request không hợp lệ còn có thể trả lỗi validation chung 40002. ADMIN/STAFF không dùng endpoint này. Tài khoản BOTH có mật khẩu cục bộ được phép đổi. Tài khoản GOOGLE nhận hướng dẫn quản lý mật khẩu tại Google.

## Triển khai

Deploy BE và FE mới. Không cần biến môi trường hay migration mới; database cần có schema hiện hành, gồm `users.token_version` và `password_resets` từ migration 014.

## Kiểm tra

- Backend: `bash mvnw -Dtest=PasswordChangeHttpTest test` trong BE (Java 21). Dùng H2 riêng, dữ liệu giả và HTTP/JWT thật, không truy cập database production.
- Frontend: `npm run build`; ESLint trên các file thay đổi.
- DOM integration: `JSDOM_MODULE=/path/to/jsdom ESBUILD_MODULE=/path/to/esbuild node --test tests/password-change.test.cjs` trong FE. Kiểm tra validation, lỗi API, gửi trùng, logout, thông báo điều hướng và tài khoản Google.
