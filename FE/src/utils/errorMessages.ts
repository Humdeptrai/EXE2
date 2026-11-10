import type { ApiErrorPayload } from "../types/api";

// Codes are stable API contracts. Do not renumber them for presentation.
export const errorMessages: Readonly<Record<number, string>> = {
  40098: "Liên kết không hợp lệ, đã dùng hoặc hết hạn. Vui lòng yêu cầu liên kết mới.", // PASSWORD_RESET_INVALID
  50398: "Chưa gửi được email đặt lại mật khẩu. Vui lòng thử lại sau ít phút.", // PASSWORD_RESET_UNAVAILABLE
  42998: "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.", // PASSWORD_RESET_RATE_LIMIT
  40997: "Thông tin định danh đã được sử dụng hoặc cần kiểm tra thêm. Vui lòng khôi phục tài khoản hoặc gửi yêu cầu kiểm tra danh tính.", // IDENTITY_DUPLICATE
  50397: "Hệ thống kiểm tra danh tính đang bận. Vui lòng thử lại sau ít phút.", // IDENTITY_REGISTRY_NOT_READY
  40991: "Kỹ năng / sở thích này đã có trong danh mục hoặc đã được đề xuất", // SKILL_ALREADY_EXISTS
  40491: "Không tìm thấy đề xuất", // SKILL_NOT_FOUND
  40091: "Vui lòng chọn kỹ năng / sở thích đã được duyệt", // SKILL_NOT_APPROVED
  40980: "Bạn chỉ có thể lưu tối đa 10 địa chỉ", // ADDRESS_LIMIT
  50380: "Tìm địa chỉ đang tạm không khả dụng. Bạn có thể nhập tay hoặc chọn địa chỉ đã lưu.", // MAP_UNAVAILABLE
  42980: "Bạn tìm địa chỉ quá nhanh hoặc đã đạt hạn mức. Vui lòng thử lại sau.", // MAP_RATE_LIMIT
  40361: "Vui lòng hoàn thiện họ tên, số điện thoại hợp lệ và nơi ở trước khi đăng hoặc nhận việc", // PROFILE_REQUIRED
  40996: "Yêu cầu xác minh của bạn đang chờ quản trị viên kiểm tra. Bạn có thể xem lại yêu cầu đã gửi.", // IDENTITY_APPEAL_BUSY
  40360: "Vui lòng xác thực danh tính trước khi đăng bài hoặc nhận việc", // IDENTITY_REQUIRED
  50360: "Tính năng xác minh danh tính hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", // IDENTITY_NOT_CONFIGURED
  40960: "Hồ sơ đang được xử lý; vui lòng chờ vài phút trước khi gửi lại", // IDENTITY_BUSY
  40060: "Ảnh xác minh cần rõ nét, định dạng JPEG và tối đa 5 MB. Nếu có video, hãy dùng MP4 dài 5–6 giây, tối đa 10 MB.", // IDENTITY_INVALID_MEDIA
  50260: "Chưa nhận được kết quả xác minh danh tính. Các bước đã lưu vẫn được giữ; vui lòng kiểm tra lại sau.", // IDENTITY_GATEWAY_ERROR
  40460: "Chưa có hồ sơ xác thực", // IDENTITY_NOT_FOUND
  50301: "Tính năng nạp tiền hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", // PAYMENT_NOT_CONFIGURED
  50201: "Chưa xác nhận được kết quả thanh toán. Hãy kiểm tra trạng thái đơn nạp; nếu đã chuyển tiền, không chuyển lại.", // PAYMENT_GATEWAY_ERROR
  40050: "Chưa xác minh được thông tin thanh toán. Vui lòng kiểm tra lại đơn nạp hoặc liên hệ hỗ trợ.", // PAYMENT_SIGNATURE_INVALID
  40950: "Giao dịch chưa khớp với đơn nạp. Nếu đã chuyển tiền, không chuyển lại; hãy liên hệ hỗ trợ để kiểm tra.", // PAYMENT_MISMATCH
  40951: "Số dư ví chưa đủ để thanh toán phí kết nối. Vui lòng nạp thêm tiền rồi thử lại.", // INSUFFICIENT_BALANCE
  40051: "Không đưa số điện thoại, email hoặc đường dẫn liên hệ vào nội dung công khai", // CONTACT_NOT_ALLOWED
  40351: "Tài khoản quản trị viên hoặc nhân viên cần đăng nhập ở trang dành cho nhân sự.", // CUSTOMER_LOGIN_REQUIRED
  40352: "Khu vực này dành cho quản trị viên và nhân viên. Vui lòng dùng trang đăng nhập người dùng.", // OPERATOR_LOGIN_REQUIRED
  40350: "Bạn không có quyền thực hiện thao tác này", // FORBIDDEN
  40001: "Email hoặc số điện thoại không hợp lệ", // INVALID_IDENTIFIER
  40002: "Thông tin bạn nhập chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu rồi thử lại.", // VALIDATION_FAILED
  40003: "Phiên đăng nhập Google đã hết hạn hoặc chưa xác nhận được. Vui lòng đăng nhập Google lại.", // INVALID_GOOGLE_TOKEN
  40004: "Đăng nhập Google hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", // GOOGLE_LOGIN_NOT_CONFIGURED
  40010: "Mỗi bài đăng chỉ được có tối đa 5 hình ảnh", // TOO_MANY_JOB_IMAGES
  40011: "Vui lòng chọn ít nhất một hình ảnh", // EMPTY_FILE
  40012: "Chỉ hỗ trợ hình ảnh JPEG, PNG hoặc WEBP", // INVALID_IMAGE_TYPE
  40013: "Mỗi hình ảnh không được vượt quá 5 MB", // IMAGE_TOO_LARGE
  40014: "Đường dẫn tệp không hợp lệ", // INVALID_FILE_PATH
  40016: "Khoảng ngân sách lọc không hợp lệ", // INVALID_BUDGET_FILTER
  40017: "Tin nhắn phải có nội dung và không được vượt quá 2000 ký tự", // CHAT_MESSAGE_INVALID
  40015: "Tổng dung lượng tệp tải lên vượt quá giới hạn cho phép", // MAX_UPLOAD_SIZE_EXCEEDED
  40101: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.", // INVALID_REFRESH_TOKEN
  40102: "Email/số điện thoại hoặc mật khẩu không đúng", // INVALID_CREDENTIALS
  40103: "Bạn cần đăng nhập lại để tiếp tục thao tác này.", // UNAUTHORIZED
  40301: "Tài khoản đang bị khóa. Vui lòng liên hệ hỗ trợ nếu bạn cho rằng có nhầm lẫn.", // USER_DISABLED
  40401: "Không tìm thấy người dùng", // USER_NOT_FOUND
  40402: "Không tìm thấy bài đăng công việc", // JOB_NOT_FOUND
  40403: "Danh mục công việc không tồn tại hoặc đã ngừng sử dụng", // JOB_CATEGORY_NOT_FOUND
  40404: "Không tìm thấy hình ảnh của bài đăng", // JOB_MEDIA_NOT_FOUND
  40405: "Công việc này đã đóng hoặc không còn nhận người. Vui lòng chọn công việc khác.", // JOB_NOT_AVAILABLE
  40406: "Không tìm thấy ứng viên cho bài đăng này", // CANDIDATE_NOT_FOUND
  40408: "Không tìm thấy cuộc trò chuyện hoặc bạn không thuộc cuộc trò chuyện này", // CONVERSATION_NOT_FOUND
  40409: "Không tìm thấy thông báo này", // NOTIFICATION_NOT_FOUND
  40901: "Email hoặc số điện thoại đã được sử dụng", // IDENTIFIER_ALREADY_EXISTS
  40902: "Tài khoản Google này đã liên kết với một tài khoản khác. Vui lòng đăng nhập bằng tài khoản đã liên kết.", // GOOGLE_ACCOUNT_CONFLICT
  40903: "Số điện thoại đã được sử dụng bởi tài khoản khác", // PHONE_ALREADY_EXISTS
  40910: "Bài đăng ở trạng thái hiện tại không thể chỉnh sửa", // JOB_EDIT_NOT_ALLOWED
  40911: "Chỉ bản nháp mới có thể được đăng", // JOB_PUBLISH_NOT_ALLOWED
  40912: "Chỉ bài đang đăng mới có thể kết thúc", // JOB_CANCEL_NOT_ALLOWED
  40913: "Chỉ bản nháp hoặc bài đã hủy mới có thể xóa", // JOB_DELETE_NOT_ALLOWED
  40915: "Ngày thực hiện đã qua, vui lòng cập nhật trước khi đăng", // JOB_SCHEDULE_IN_PAST
  40916: "Bạn không thể tương tác với bài đăng của chính mình", // OWN_JOB_INTERACTION_NOT_ALLOWED
  40917: "Hãy rút sự quan tâm trước khi bỏ qua công việc này", // JOB_ALREADY_INTERESTED
  40918: "Yêu cầu quan tâm đã được phản hồi và không thể thay đổi", // JOB_INTEREST_LOCKED
  40919: "Bài đăng đã ngừng nhận ứng viên. Vui lòng làm mới trang để xem trạng thái mới nhất.", // JOB_MATCHING_NOT_AVAILABLE
  40920: "Công việc này đã đủ người. Vui lòng chọn bài đăng hoặc ứng viên khác.", // JOB_MATCH_CAPACITY_FULL
  40921: "Ứng viên này đã được phản hồi trước đó", // CANDIDATE_ALREADY_RESPONDED
  40922: "Bài đăng đã có matching, hãy dùng luồng ngắt kết nối thay vì hủy trực tiếp", // JOB_HAS_ACTIVE_MATCHES
  40924: "Bài đăng đã có matching nên không thể thay đổi điều kiện công việc cốt lõi", // JOB_CORE_FIELDS_LOCKED_AFTER_MATCH
  40925: "Sau khi có matching, số người cần chỉ được tăng và không được giảm", // JOB_REQUIRED_WORKERS_DECREASE_NOT_ALLOWED
  40407: "Không tìm thấy matching hoặc bạn không thuộc matching này", // MATCH_NOT_FOUND
  40926: "Matching không còn hoạt động để thanh toán", // PAYMENT_MATCH_NOT_ACTIVE
  40927: "Khoản phí kết nối này đã được hoàn trả", // PAYMENT_ALREADY_REFUNDED
  40928: "Cuộc trò chuyện chỉ được mở sau khi cả người thuê và người nhận việc đã thanh toán phí kết nối", // CHAT_NOT_UNLOCKED
  40929: "Matching không còn hoạt động để gửi tin nhắn", // CHAT_MATCH_NOT_ACTIVE
  40930: "Chỉ có thể đánh giá sau khi hai phía hoàn tất phí kết nối", // RATING_CONNECTION_REQUIRED
  40931: "Chưa đến thời điểm đánh giá; vui lòng xem thời gian mở đánh giá của matching", // RATING_NOT_AVAILABLE_YET
  40932: "Bạn đã đánh giá người này cho matching này rồi", // RATING_ALREADY_SUBMITTED
  40990: "Thông tin đã thay đổi hoặc bị trùng. Vui lòng tải lại trang để kiểm tra trước khi thao tác tiếp.", // DATA_CONFLICT
  50010: "Không thể lưu hình ảnh lúc này", // FILE_STORAGE_FAILED
  42944: "Hệ thống đang kiểm tra khuôn mặt cho lượt khác. Vui lòng chờ một lát rồi thử lại.", // IDENTITY_SCAN_BUSY
  40044: "Cần ảnh JPEG rõ nét, từ 320 × 240 và tối đa 5 MB.", // IDENTITY_SCAN_MEDIA
  40944: "Phiên quét đã hết hạn hoặc không còn hợp lệ. Hãy bắt đầu lại.", // IDENTITY_SESSION_EXPIRED
  42244: "Chưa nhận rõ khuôn mặt hoặc động tác xác minh. Vui lòng đứng đủ sáng, giữ mặt trong khung và thực hiện lại.", // IDENTITY_SCAN_FAILED
  40945: "Tài khoản đã được xác thực.", // IDENTITY_ALREADY_VERIFIED
  40070: "Thời gian kết thúc dự kiến phải được nhập và sau thời gian bắt đầu", // JOB_END_TIME_INVALID
  40933: "Đã hết hạn đánh giá cho matching này", // RATING_WINDOW_EXPIRED
  40934: "Chỉ có thể báo cáo đối tác khi cả hai bên đã hoàn tất phí kết nối; bạn vẫn có thể gửi yêu cầu hỗ trợ thanh toán", // REPORT_CONNECTION_REQUIRED
  40470: "Không tìm thấy báo cáo hoặc bạn không có quyền xem", // REPORT_NOT_FOUND
  40970: "Báo cáo đang được người khác xử lý. Vui lòng làm mới danh sách", // REPORT_ALREADY_ASSIGNED
  40971: "Bạn cần nhận xử lý báo cáo trước khi thực hiện thao tác này", // REPORT_CLAIM_REQUIRED
  40972: "Báo cáo đã kết thúc xử lý và không thể thay đổi", // REPORT_CLOSED
  40072: "Chỉ gửi tối đa 5 link HTTP/HTTPS hợp lệ, mỗi link tối đa 2.000 ký tự", // REPORT_LINK_INVALID
  50070: "Không thể lưu hoặc tải bằng chứng lúc này. Vui lòng thử lại", // REPORT_EVIDENCE_STORAGE_FAILED
  50000: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút; nếu vẫn gặp lỗi, hãy liên hệ hỗ trợ.", // INTERNAL_ERROR
};

const sharedMessages: Readonly<Record<number, string>> = {
  40961: "Trạng thái hồ sơ hoặc thanh toán đã thay đổi. Vui lòng tải lại trang để kiểm tra trước khi thao tác tiếp.",
  40914: "Trạng thái bài đăng chưa cho phép thực hiện thao tác này. Vui lòng tải lại bài đăng để kiểm tra.",
  40071: "Tệp gửi lên chưa đúng định dạng hoặc vượt quá dung lượng cho phép. Vui lòng kiểm tra tệp rồi gửi lại.",
};

export function friendlyText(text: unknown, fallback = "Chưa thể thực hiện thao tác này. Vui lòng kiểm tra thông tin và thử lại sau."): string {
  if (typeof text !== "string" || !text.trim()) return fallback;
  // Never expose raw transport errors, stack traces, SQL or server responses.
  if (/exception|stack\s*trace|\bSQL\b|\bselect\s+.+\s+from\b|\bjava\.|\[object Object\]|<\/?(?:html|script)|request failed with status|network error|^\s*[A-Z_]{4,}\s*$|^\s*\d{3,}\s*$/i.test(text)) return fallback;
  return text.trim().replace(/\s+/g, " ")
    .replace(/\bmatching\b/gi, "kết nối")
    .replace(/\bADMIN\/STAFF\b/g, "quản trị viên hoặc nhân viên")
    .replace(/\bADMIN\b/g, "quản trị viên").replace(/\bSTAFF\b/g, "nhân viên")
    .replace(/Refresh token|access token|Google credential|credential/gi, "phiên đăng nhập")
    .replace(/HTTPS hoặc localhost/gi, "kết nối an toàn và cấp quyền camera trong trình duyệt")
    .slice(0, 1200);
}

export function friendlyApiMessage(payload: ApiErrorPayload | undefined, fallback: string, status?: number, url = ""): string {
  const validation = payload?.errors && typeof payload.errors === "object" ? Object.values(payload.errors) : [];
  const detail = validation.find(value => typeof value === "string" && value.trim());
  if (detail) return /[à-ỹđ]/i.test(detail) ? friendlyText(detail)
    : "Thông tin bạn nhập chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.";
  const code = payload?.code;
  // Three legacy numbers are shared by distinct business errors. Preserve the
  // server's specific explanation instead of assigning a misleading new one.
  if (code != null && sharedMessages[code]) return friendlyText(payload?.message, sharedMessages[code]);
  if (code != null && errorMessages[code]) return friendlyText(errorMessages[code], fallback);
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
  if (status === 403) return "Bạn chưa có quyền thực hiện thao tác này. Vui lòng kiểm tra tài khoản hoặc liên hệ hỗ trợ.";
  if (status === 413) return "Tệp tải lên quá lớn. Vui lòng chọn tệp nhỏ hơn rồi thử lại.";
  if (status === 429) return "Bạn đang thao tác quá nhanh hoặc hệ thống đang bận. Vui lòng chờ một lát rồi thử lại.";
  if (status != null && status >= 500) return /wallet|payment|topup/i.test(url)
    ? "Chưa xác nhận được kết quả giao dịch. Nếu đã chuyển tiền, không chuyển lại; hãy kiểm tra đơn nạp hoặc liên hệ hỗ trợ."
    : "Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.";
  // Unknown responses may contain implementation details; accept only readable
  // Vietnamese text, otherwise use the caller's action-specific guidance.
  return typeof payload?.message === "string" && /[à-ỹđ]/i.test(payload.message)
    ? friendlyText(payload.message, fallback) : friendlyText(fallback);
}
