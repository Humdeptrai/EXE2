# Thông báo lỗi cho người dùng

Mã lỗi và hợp đồng API được giữ nguyên. `src/utils/errorMessages.ts` chuyển lỗi
thành hướng dẫn tiếng Việt cho giao diện, gồm lỗi nhập liệu, đăng nhập, xác minh,
việc làm, kết nối, ví, chat, báo cáo và quản trị. Chi tiết kỹ thuật như stack
trace, SQL, HTML lỗi hay tên token không được dùng làm nội dung popup.

Ba mã cũ `40961`, `40914`, `40071` đang dùng cho nhiều trường hợp. Các mã này
giữ lời giải thích cụ thể từ backend thay vì bị thay bằng một thông báo sai
ngữ cảnh. Bài kiểm tra đối chiếu toàn bộ `ErrorCode.java` để phát hiện mã mới
chưa có nội dung tương ứng.

`FeedbackProvider` nằm ở gốc ứng dụng để hỗ trợ cả trang đăng nhập, người dùng
và quản trị. Lỗi được trình bày qua `getApiErrorMessage`/`getAuthError`, các vùng
`role="alert"` và lỗi kiểm tra biểu mẫu đều dùng popup chung. `role="alert"`
chỉ dùng cho lỗi cần người dùng chú ý; trạng thái thành công hoặc đang chờ dùng
`role="status"`. Kết quả CCCD cần kiểm tra thêm cũng thông báo dù HTTP trả 200.

Popup không tự biến mất; người dùng đóng bằng X, Đóng hoặc Esc. Thông tin đang
nhập và lời nhắc tại ô nhập được giữ lại. Nhiều lỗi cùng lượt được gom lại, lỗi
trùng không chồng popup, việc tải nền không liên tục mở lại lỗi đã đóng. Thao
tác mới của người dùng có thể thông báo lại lỗi đó. Lỗi hủy yêu cầu và những
lượt thử lại nội bộ chưa thất bại cuối cùng không mở popup. Hộp xác nhận nghiệp
vụ được ưu tiên; đóng popup lỗi không đồng ý xóa, thanh toán hay gửi lại dữ liệu.

Chỉ triển khai lại frontend cho thay đổi này; không cần thay backend, worker
hoặc schema database.

## Kiểm tra

```sh
npm run build
ESBUILD_MODULE=/path/to/esbuild JSDOM_MODULE=/path/to/jsdom node --test tests/user-errors.test.cjs tests/profile-save.test.cjs
```

Hai thư viện kiểm tra có thể được cung cấp từ môi trường kiểm tra riêng như các
bài kiểm tra hiện có. Các bài kiểm tra dùng React DOM, dữ liệu giả lập và không
gọi API production. Chúng kiểm tra nội dung lỗi, mã dùng chung, chống lộ lỗi kỹ
thuật, đóng popup, gom lỗi, kiểm tra biểu mẫu, giữ dữ liệu, đăng nhập/hết phiên
và bảo toàn hành vi xác nhận nghiệp vụ.
