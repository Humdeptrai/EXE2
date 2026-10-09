package com.handsfree.be.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    IDENTITY_REQUIRED(40360, HttpStatus.FORBIDDEN, "Vui lòng xác thực danh tính trước khi đăng bài hoặc nhận việc"),
    IDENTITY_NOT_CONFIGURED(50360, HttpStatus.SERVICE_UNAVAILABLE, "Xác thực danh tính chưa được cấu hình; vui lòng liên hệ hỗ trợ"),
    IDENTITY_BUSY(40960, HttpStatus.CONFLICT, "Hồ sơ đang được xử lý; vui lòng chờ vài phút trước khi gửi lại"),
    IDENTITY_INVALID_MEDIA(40060, HttpStatus.BAD_REQUEST, "Cần ảnh JPEG rõ nét và video MP4 5–6 giây; ảnh tối đa 5 MB, video tối đa 10 MB"),
    IDENTITY_GATEWAY_ERROR(50260, HttpStatus.BAD_GATEWAY, "Dịch vụ xác thực chưa phản hồi hợp lệ; vui lòng thử lại sau"),
    IDENTITY_NOT_FOUND(40460, HttpStatus.NOT_FOUND, "Chưa có hồ sơ xác thực"),
    PAYMENT_DEADLINE_EXPIRED(40961, HttpStatus.CONFLICT, "Đã hết hạn thanh toán; phí thực tế đã trả sẽ được hoàn về ví"),
    PAYMENT_NOT_CONFIGURED(50301, HttpStatus.SERVICE_UNAVAILABLE, "Nạp tiền chưa được cấu hình trên máy chủ"),
    PAYMENT_GATEWAY_ERROR(50201, HttpStatus.BAD_GATEWAY, "Cổng thanh toán chưa phản hồi hợp lệ; vui lòng kiểm tra lại đơn nạp"),
    PAYMENT_SIGNATURE_INVALID(40050, HttpStatus.BAD_REQUEST, "Chữ ký thanh toán không hợp lệ"),
    PAYMENT_MISMATCH(40950, HttpStatus.CONFLICT, "Thông tin giao dịch không khớp với đơn nạp"),
    INSUFFICIENT_BALANCE(40951, HttpStatus.CONFLICT, "Số dư ví không đủ; vui lòng nạp thêm tiền"),
    CONTACT_NOT_ALLOWED(40051, HttpStatus.BAD_REQUEST, "Không đưa số điện thoại, email hoặc đường dẫn liên hệ vào nội dung công khai"),
    CUSTOMER_LOGIN_REQUIRED(40351, HttpStatus.FORBIDDEN, "Tài khoản ADMIN/STAFF vui lòng đăng nhập tại /management/login"),
    OPERATOR_LOGIN_REQUIRED(40352, HttpStatus.FORBIDDEN, "Khu vực này chỉ dành cho ADMIN/STAFF; tài khoản người dùng vui lòng đăng nhập tại /login"),
    FORBIDDEN(40350, HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    INVALID_IDENTIFIER(40001, HttpStatus.BAD_REQUEST, "Email hoặc số điện thoại không hợp lệ"),
    VALIDATION_FAILED(40002, HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên chưa hợp lệ"),
    INVALID_GOOGLE_TOKEN(40003, HttpStatus.BAD_REQUEST, "Google credential không hợp lệ hoặc đã hết hạn"),
    GOOGLE_LOGIN_NOT_CONFIGURED(40004, HttpStatus.BAD_REQUEST, "Google Login chưa được cấu hình trên máy chủ"),
    TOO_MANY_JOB_IMAGES(40010, HttpStatus.BAD_REQUEST, "Mỗi bài đăng chỉ được có tối đa 5 hình ảnh"),
    EMPTY_FILE(40011, HttpStatus.BAD_REQUEST, "Vui lòng chọn ít nhất một hình ảnh"),
    INVALID_IMAGE_TYPE(40012, HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ hình ảnh JPEG, PNG hoặc WEBP"),
    IMAGE_TOO_LARGE(40013, HttpStatus.BAD_REQUEST, "Mỗi hình ảnh không được vượt quá 5 MB"),
    INVALID_FILE_PATH(40014, HttpStatus.BAD_REQUEST, "Đường dẫn tệp không hợp lệ"),
    INVALID_BUDGET_FILTER(40016, HttpStatus.BAD_REQUEST, "Khoảng ngân sách lọc không hợp lệ"),
    CHAT_MESSAGE_INVALID(40017, HttpStatus.BAD_REQUEST, "Tin nhắn phải có nội dung và không được vượt quá 2000 ký tự"),
    MAX_UPLOAD_SIZE_EXCEEDED(40015, HttpStatus.BAD_REQUEST, "Tổng dung lượng hình ảnh tải lên vượt quá giới hạn"),
    INVALID_REFRESH_TOKEN(40101, HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ hoặc đã hết hạn"),
    INVALID_CREDENTIALS(40102, HttpStatus.UNAUTHORIZED, "Email/số điện thoại hoặc mật khẩu không đúng"),
    UNAUTHORIZED(40103, HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tiếp tục"),
    USER_DISABLED(40301, HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa"),
    USER_NOT_FOUND(40401, HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"),
    JOB_NOT_FOUND(40402, HttpStatus.NOT_FOUND, "Không tìm thấy bài đăng công việc"),
    JOB_CATEGORY_NOT_FOUND(40403, HttpStatus.NOT_FOUND, "Danh mục công việc không tồn tại hoặc đã ngừng sử dụng"),
    JOB_MEDIA_NOT_FOUND(40404, HttpStatus.NOT_FOUND, "Không tìm thấy hình ảnh của bài đăng"),
    JOB_NOT_AVAILABLE(40405, HttpStatus.NOT_FOUND, "Công việc không còn khả dụng để khám phá"),
    CANDIDATE_NOT_FOUND(40406, HttpStatus.NOT_FOUND, "Không tìm thấy ứng viên cho bài đăng này"),
    CONVERSATION_NOT_FOUND(40408, HttpStatus.NOT_FOUND, "Không tìm thấy cuộc trò chuyện hoặc bạn không thuộc cuộc trò chuyện này"),
    NOTIFICATION_NOT_FOUND(40409, HttpStatus.NOT_FOUND, "Không tìm thấy thông báo này"),
    IDENTIFIER_ALREADY_EXISTS(40901, HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng"),
    GOOGLE_ACCOUNT_CONFLICT(40902, HttpStatus.CONFLICT, "Tài khoản Google này đã liên kết với người dùng khác"),
    PHONE_ALREADY_EXISTS(40903, HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng bởi tài khoản khác"),
    JOB_EDIT_NOT_ALLOWED(40910, HttpStatus.CONFLICT, "Bài đăng ở trạng thái hiện tại không thể chỉnh sửa"),
    JOB_PUBLISH_NOT_ALLOWED(40911, HttpStatus.CONFLICT, "Chỉ bản nháp mới có thể được đăng"),
    JOB_CANCEL_NOT_ALLOWED(40912, HttpStatus.CONFLICT, "Chỉ bài đang đăng mới có thể kết thúc"),
    JOB_DELETE_NOT_ALLOWED(40913, HttpStatus.CONFLICT, "Chỉ bản nháp hoặc bài đã hủy mới có thể xóa"),
    JOB_REPOST_NOT_ALLOWED(40914, HttpStatus.CONFLICT, "Chỉ bài đã hoàn thành hoặc đã hủy mới có thể đăng lại"),
    JOB_SCHEDULE_IN_PAST(40915, HttpStatus.CONFLICT, "Ngày thực hiện đã qua, vui lòng cập nhật trước khi đăng"),
    OWN_JOB_INTERACTION_NOT_ALLOWED(40916, HttpStatus.CONFLICT, "Bạn không thể tương tác với bài đăng của chính mình"),
    JOB_ALREADY_INTERESTED(40917, HttpStatus.CONFLICT, "Hãy rút sự quan tâm trước khi bỏ qua công việc này"),
    JOB_INTEREST_LOCKED(40918, HttpStatus.CONFLICT, "Yêu cầu quan tâm đã được phản hồi và không thể thay đổi"),
    JOB_MATCHING_NOT_AVAILABLE(40919, HttpStatus.CONFLICT, "Bài đăng không còn mở để xử lý matching"),
    JOB_MATCH_CAPACITY_FULL(40920, HttpStatus.CONFLICT, "Bài đăng đã đủ số người cần matching"),
    CANDIDATE_ALREADY_RESPONDED(40921, HttpStatus.CONFLICT, "Ứng viên này đã được phản hồi trước đó"),
    JOB_HAS_ACTIVE_MATCHES(40922, HttpStatus.CONFLICT, "Bài đăng đã có matching, hãy dùng luồng ngắt kết nối thay vì hủy trực tiếp"),
    JOB_CORE_FIELDS_LOCKED_AFTER_MATCH(40924, HttpStatus.CONFLICT, "Bài đăng đã có matching nên không thể thay đổi điều kiện công việc cốt lõi"),
    JOB_REQUIRED_WORKERS_DECREASE_NOT_ALLOWED(40925, HttpStatus.CONFLICT, "Sau khi có matching, số người cần chỉ được tăng và không được giảm"),
    MATCH_NOT_FOUND(40407, HttpStatus.NOT_FOUND, "Không tìm thấy matching hoặc bạn không thuộc matching này"),
    PAYMENT_MATCH_NOT_ACTIVE(40926, HttpStatus.CONFLICT, "Matching không còn hoạt động để thanh toán"),
    PAYMENT_ALREADY_REFUNDED(40927, HttpStatus.CONFLICT, "Khoản phí kết nối này đã được hoàn trả"),
    CHAT_NOT_UNLOCKED(40928, HttpStatus.CONFLICT, "Cuộc trò chuyện chỉ được mở sau khi cả người thuê và người nhận việc đã thanh toán phí kết nối"),
    CHAT_MATCH_NOT_ACTIVE(40929, HttpStatus.CONFLICT, "Matching không còn hoạt động để gửi tin nhắn"),
    RATING_CONNECTION_REQUIRED(40930, HttpStatus.CONFLICT, "Chỉ có thể đánh giá sau khi hai phía hoàn tất phí kết nối"),
    RATING_NOT_AVAILABLE_YET(40931, HttpStatus.CONFLICT, "Chưa đến thời điểm đánh giá; vui lòng thử lại sau thời gian công việc ít nhất 1 giờ"),
    RATING_ALREADY_SUBMITTED(40932, HttpStatus.CONFLICT, "Bạn đã đánh giá người này cho matching này rồi"),
    DATA_CONFLICT(40990, HttpStatus.CONFLICT, "Dữ liệu bị xung đột với trạng thái hiện tại"),
    FILE_STORAGE_FAILED(50010, HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu hình ảnh lúc này"),
    IDENTITY_SCAN_BUSY(42944, HttpStatus.TOO_MANY_REQUESTS, "Bộ xử lý khuôn mặt đang bận. Vui lòng thử lại trong giây lát."),
    IDENTITY_SCAN_MEDIA(40044, HttpStatus.BAD_REQUEST, "Cần ảnh JPEG rõ nét, từ 320 × 240 và tối đa 5 MB."),
    IDENTITY_SESSION_EXPIRED(40944, HttpStatus.CONFLICT, "Phiên quét đã hết hạn hoặc không còn hợp lệ. Hãy bắt đầu lại."),
    IDENTITY_SCAN_FAILED(42244, HttpStatus.UNPROCESSABLE_ENTITY, "Chưa vượt qua kiểm tra khuôn mặt. Dùng khuôn mặt thật, đủ sáng và thực hiện lại."),
    IDENTITY_ALREADY_VERIFIED(40945, HttpStatus.CONFLICT, "Tài khoản đã được xác thực."),
    INTERNAL_ERROR(50000, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống");

    private final int code;
    private final HttpStatus status;
    private final String message;

    ErrorCode(int code, HttpStatus status, String message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }
}
