# Nhật ký quản trị dành cho vận hành

Không cần migration SQL. Deploy backend và frontend cùng phiên bản.

## Sự kiện quan trọng

Giữ trên trang Nhật ký: cộng tiền ví/hoàn phí; thay đổi vai trò hoặc khóa/mở tài khoản; ẩn/hiện bài; cấu hình phí, giới hạn nạp, hạn thanh toán và đánh giá; điều kiện matching; OTP đăng ký và phương thức xác minh; đổi lịch công việc; kết quả duyệt/từ chối, sửa hoặc chuyển quyền định danh; bổ sung dữ liệu kiểm tra trùng danh tính; kết quả giải quyết/từ chối báo cáo.

Không ghi mới các thao tác nhận/hủy nhận xử lý thông thường. Không ghi thêm khi lưu lại đúng cấu hình/trạng thái cũ hoặc chạy bổ sung danh tính mà không xử lý được hồ sơ nào. Duyệt danh tính thủ công chỉ có một sự kiện chứa lý do thay vì hai bản ghi duyệt trùng nhau.

Truy cập hồ sơ/ảnh CCCD là dữ liệu nhạy cảm: vẫn lưu dấu truy cập trong database để điều tra quyền riêng tư, nhưng lọc khỏi trang nhật ký vận hành. Các bản ghi cũ không bị xóa. Khi bổ sung loại sự kiện quan trọng mới, thêm vào `AdminAuditPolicy.IMPORTANT` và mô tả tiếng Việt tương ứng.

## Hiển thị và tìm kiếm

- Backend lọc loại sự kiện trước phân trang và đếm tổng; không lọc riêng trang đang xem ở frontend.
- Bản ghi cũ lẫn mới được chuyển sang mô tả nghiệp vụ, nhãn thông tin tiếng Việt, số tiền VNĐ và lịch ngày/tháng/năm. Không trả chi tiết kỹ thuật thô ra DTO trang nhật ký. Thông tin lý do vẫn hiển thị khi bản ghi có lưu lý do; không suy diễn dữ liệu lịch sử còn thiếu.
- Người thực hiện gồm tên, email và trường riêng **ID tài khoản người thực hiện**. UUID bản ghi là **ID bản ghi nhật ký**. Các UUID trong nội dung được ghi là ID đối tượng liên quan, không phải tên người thực hiện.
- Tên/email lấy từ tài khoản hiện tại và truy vấn theo lô cho từng trang, không phải ảnh chụp thông tin tại thời điểm thực hiện. Nếu tài khoản không còn tồn tại, vẫn giữ ID để truy vết và hiển thị rõ không tìm thấy tài khoản.
- Tìm theo tên, email, ID và nội dung đã lưu; bộ lọc loại sự kiện chỉ chứa nhóm quan trọng. Chỉ ADMIN có quyền đọc trang này.
- Đây là nhật ký thay đổi nghiệp vụ, không thay thế log lỗi ứng dụng trên máy chủ. Không tự sao chép stack trace hay thông tin bí mật vào nhật ký.

## Kiểm tra

`AdminAuditPolicyTest` kiểm tra chọn lọc, dữ liệu cũ, tiền/ngày giờ và nhãn ID. `OperatorListsHttpTest.auditFiltersBeforePagingAndSearchesActorEmail` kiểm tra lọc trước phân trang, tổng số, tìm theo email và DTO. `FE/tests/admin-audit.test.cjs` kiểm tra tên/email và nhãn UUID trong trang danh sách/cửa sổ chi tiết. Không chỉnh dữ liệu production khi kiểm thử.
