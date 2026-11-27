package com.handsfree.be.serviceImpl;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class IdentityFeedbackService {
    private final UserRepository users;
    private final NotificationRepository records;
    private final NotificationService notifications;
    public static NotificationType type(String status,String reason,boolean admin) {
        if ("VERIFIED".equals(status)) return NotificationType.IDENTITY_APPROVED;
        if (admin && "REJECTED".equals(status)) return NotificationType.IDENTITY_REJECTED;
        reason=reason==null?"":reason;
        boolean document=reason.contains("Trùng số CCCD") || reason.contains("trùng số CCCD");
        boolean face=reason.contains("Trùng khuôn mặt") || reason.contains("trùng khuôn mặt");
        if(document&&face)return NotificationType.IDENTITY_DUPLICATE_BOTH;
        if(document)return NotificationType.IDENTITY_DUPLICATE_DOCUMENT;
        if(face)return NotificationType.IDENTITY_DUPLICATE_FACE;
        return NotificationType.IDENTITY_ACTION_REQUIRED;
    }
    public void send(UUID user,String status,String reason,boolean admin) {
        var type=type(status,reason,admin);
        String title=switch(type){
            case IDENTITY_APPROVED -> "Xác minh danh tính thành công";
            case IDENTITY_REJECTED -> "Hồ sơ xác minh bị từ chối";
            case IDENTITY_DUPLICATE_BOTH -> "Trùng CCCD và khuôn mặt";
            case IDENTITY_DUPLICATE_DOCUMENT -> "Trùng số CCCD";
            case IDENTITY_DUPLICATE_FACE -> "Trùng khuôn mặt";
            default -> "Xác minh cần xử lý bổ sung";
        };
        String message=reason==null||reason.isBlank()?"Vui lòng mở hồ sơ để xem kết quả xác minh và bước cần thực hiện.":reason;
        message=message.substring(0,Math.min(500,message.length()));
        // A retry or duplicate response must not flood the bell with identical messages.
        if(records.existsByRecipient_IdAndTypeAndMessageAndCreatedAtAfter(user,type,message,java.time.Instant.now().minusSeconds(60)))return;
        notifications.create(users.findById(user).orElseThrow(),type,title,message,user,"/profile?identity=1");
    }
}
