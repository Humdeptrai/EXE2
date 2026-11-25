package com.handsfree.be.serviceImpl;

import java.util.*;
import java.util.regex.*;

/** Business audit catalog. Raw diagnostic data stays in storage, never in the admin DTO. */
public final class AdminAuditPolicy {
    private AdminAuditPolicy() {}
    public static final Set<String> IMPORTANT = Set.of(
        "ADMIN_WALLET_CREDIT", "CONNECTION_REFUND", "USER_ACCESS", "JOB_VISIBILITY",
        "FEE_SETTINGS", "RATING_SETTINGS", "MATCHING_REQUIREMENTS_SETTINGS", "REGISTRATION_EMAIL_SETTINGS",
        "IDENTITY_PHOTO_UPLOAD_SETTINGS", "MATCH_SCHEDULE_CHANGE", "IDENTITY_APPROVE", "IDENTITY_REJECT",
        "IDENTITY_MANUAL_APPROVAL", "IDENTITY_OWNERSHIP_TRANSFER", "IDENTITY_DOCUMENT_CORRECTION",
        "IDENTITY_REGISTRY_BACKFILL", "REPORT_RESOLVE", "REPORT_RESOLVED", "REPORT_REJECTED");
    private static final Set<String> PRIVATE_ACCESS = Set.of("IDENTITY_VIEW", "IDENTITY_IMAGE_VIEW",
        "IDENTITY_CONFLICT_VIEW", "IDENTITY_CONFLICT_EVIDENCE_VIEW", "IDENTITY_CONFLICT_IMAGE_VIEW");
    public static boolean shouldStore(String action) { return IMPORTANT.contains(action) || PRIVATE_ACCESS.contains(action); }
    private static final Pattern FIELD = Pattern.compile("(?:^|\\s)([A-Za-z][A-Za-z0-9]*)=([^\\s]+)");
    private static final Pattern UUID_PATTERN = Pattern.compile("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}");
    private static final Map<String,String> LABELS = Map.ofEntries(
        Map.entry("user","ID tài khoản liên quan"),Map.entry("job","ID bài đăng"),Map.entry("selectedMatch","ID kết nối được chọn"),
        Map.entry("amount","Số tiền cộng vào ví"),Map.entry("order","Mã giao dịch"),Map.entry("request","Mã yêu cầu"),Map.entry("report","ID báo cáo"),
        Map.entry("role","Vai trò mới"),Map.entry("active","Trạng thái tài khoản"),Map.entry("hidden","Trạng thái bài đăng"),
        Map.entry("consumer","Phí người thuê"),Map.entry("provider","Phí người nhận việc"),Map.entry("min","Nạp tối thiểu"),Map.entry("max","Nạp tối đa"),
        Map.entry("enabled","Cho phép nạp tiền"),Map.entry("paymentWindowMinutes","Hạn thanh toán (phút)"),
        Map.entry("delayMinutes","Chờ mở đánh giá (phút)"),Map.entry("windowDays","Thời hạn đánh giá (ngày)"),
        Map.entry("oldStart","Bắt đầu trước khi sửa"),Map.entry("oldEnd","Kết thúc trước khi sửa"),
        Map.entry("newStart","Bắt đầu sau khi sửa"),Map.entry("newEnd","Kết thúc sau khi sửa"),
        Map.entry("matchCount","Số kết nối được cập nhật"),Map.entry("timeZone","Múi giờ"),
        Map.entry("processed","Số hồ sơ đã bổ sung"),Map.entry("remaining","Số hồ sơ còn lại"),Map.entry("assignedTo","ID người xử lý"));
    public static String describe(String action, String raw) {
        raw = raw == null ? "" : raw;
        Map<String,String> fields = new LinkedHashMap<>();
        Matcher m = FIELD.matcher(raw);
        while(m.find()) fields.putIfAbsent(m.group(1),m.group(2));
        String summary = switch(action) {
            case "MATCHING_REQUIREMENTS_SETTINGS" -> "false".equals(fields.get("enabled")) ? "Đã tắt yêu cầu hoàn thiện hồ sơ và xác thực khi kết nối. Phí kết nối vẫn áp dụng." : "Đã bật yêu cầu hoàn thiện hồ sơ và xác thực khi kết nối.";
            case "REGISTRATION_EMAIL_SETTINGS" -> "true".equals(fields.get("otpRequired")) ? "Đã bật xác thực OTP email cho đăng ký mới." : "Đã tắt xác thực OTP email cho đăng ký mới.";
            case "IDENTITY_PHOTO_UPLOAD_SETTINGS" -> "true".equals(fields.get("enabled")) ? "Đã cho phép tải ảnh khuôn mặt; hồ sơ vẫn cần quản trị viên duyệt." : "Đã tắt tải ảnh khuôn mặt; người dùng tiếp tục dùng camera.";
            case "ADMIN_WALLET_CREDIT" -> "Đã cộng tiền vào ví người dùng.";
            case "CONNECTION_REFUND" -> "Đã hoàn các khoản phí kết nối đã thanh toán về ví.";
            case "USER_ACCESS" -> "Đã thay đổi quyền hoặc trạng thái tài khoản.";
            case "JOB_VISIBILITY" -> "true".equals(fields.get("hidden")) ? "Đã ẩn bài đăng." : "Đã cho hiển thị lại bài đăng.";
            case "FEE_SETTINGS" -> "Đã cập nhật phí kết nối, giới hạn nạp tiền hoặc hạn thanh toán.";
            case "RATING_SETTINGS" -> "Đã cập nhật thời gian mở và thời hạn đánh giá.";
            case "MATCH_SCHEDULE_CHANGE" -> "Đã đổi lịch bài đăng và toàn bộ kết nối thuộc bài.";
            case "IDENTITY_APPROVE" -> "Đã phê duyệt hồ sơ xác thực danh tính.";
            case "IDENTITY_REJECT" -> "Đã từ chối hồ sơ xác thực danh tính.";
            case "IDENTITY_MANUAL_APPROVAL" -> "Đã duyệt thủ công hồ sơ cần kiểm tra bổ sung; giữ nguyên chủ sở hữu định danh hiện có.";
            case "IDENTITY_OWNERSHIP_TRANSFER" -> "Đã chuyển quyền sở hữu định danh giữa các tài khoản.";
            case "IDENTITY_DOCUMENT_CORRECTION" -> "Đã sửa thông tin CCCD; số giấy tờ được che để bảo vệ thông tin cá nhân.";
            case "IDENTITY_REGISTRY_BACKFILL" -> "Đã bổ sung dữ liệu kiểm tra trùng danh tính cho hồ sơ cũ.";
            case "REPORT_RESOLVE", "REPORT_RESOLVED", "REPORT_REJECTED" -> action.equals("REPORT_REJECTED") || raw.matches("(?s).*\\bREJECTED\\b.*") ? "Đã từ chối báo cáo sau khi xem xét." : "Đã giải quyết báo cáo và phản hồi người gửi.";
            default -> "Đã thực hiện thao tác quản trị.";
        };
        var lines = new ArrayList<String>(); lines.add(summary);
        var id = UUID_PATTERN.matcher(raw);
        if(id.lookingAt()) {
            String label = action.startsWith("IDENTITY_") || action.equals("USER_ACCESS") ? "ID tài khoản liên quan" : action.startsWith("REPORT_") ? "ID báo cáo" : action.equals("JOB_VISIBILITY") ? "ID bài đăng" : "ID kết nối";
            lines.add(label + ": " + id.group());
        }
        for(var field: fields.entrySet()) {
            String key=field.getKey(), value=field.getValue(), label=LABELS.get(key);
            if(label==null || value.equals("null") || key.equals("enabled") && !action.equals("FEE_SETTINGS")) continue;
            if(Set.of("consumer","provider","min","max","amount").contains(key)) {
                try {value=String.format(Locale.forLanguageTag("vi-VN"),"%,.0f đ",new java.math.BigDecimal(value));}catch(NumberFormatException ignored){value="Không có dữ liệu";}
            } else if(key.equals("role")) value=switch(value){case "ADMIN"->"Quản trị viên";case "STAFF"->"Nhân viên";case "USER"->"Người dùng";default->"Không xác định";};
            else if(Set.of("active","enabled","hidden").contains(key)) value=key.equals("active") ? (value.equals("true")?"Hoạt động":"Đã khóa") : value.equals("true")?"Bật":"Tắt";
            else if(Set.of("oldStart","oldEnd","newStart","newEnd").contains(key)) {try{value=java.time.LocalDateTime.parse(value).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));}catch(java.time.DateTimeException ignored){value="Không có dữ liệu";}}
            lines.add(label + ": " + value);
        }
        if (action.equals("IDENTITY_REGISTRY_BACKFILL")) {
            Matcher review=Pattern.compile("needsReview=\\[([^\\]]*)\\]").matcher(raw);
            if (review.find() && !review.group(1).isBlank()) lines.add("ID tài khoản cần kiểm tra bổ sung: " + review.group(1));
        }
        String reason = null;
        int reasonAt=raw.indexOf("reason=");
        if(reasonAt>=0) reason=raw.substring(reasonAt+7);
        else if(raw.contains(" | ")) reason=raw.substring(raw.lastIndexOf(" | ")+3);
        else if(action.equals("CONNECTION_REFUND") && raw.length()>36) reason=raw.substring(36).trim();
        else if(Set.of("USER_ACCESS","JOB_VISIBILITY").contains(action)) {
            Matcher last=FIELD.matcher(raw);int end=0;while(last.find())end=last.end();if(end>0)reason=raw.substring(end).trim();
        }
        if(reason!=null&&!reason.isBlank()) lines.add("Lý do: "+reason.trim());
        return String.join("\n",lines);
    }
}
