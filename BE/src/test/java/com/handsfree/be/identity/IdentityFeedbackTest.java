package com.handsfree.be.identity;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.entity.User;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.NotificationService;
import com.handsfree.be.serviceImpl.IdentityFeedbackService;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class IdentityFeedbackTest {
 @Test void distinctConflictsAndAdminDecisionsHaveDistinctNotificationTypes(){
  assertEquals(NotificationType.IDENTITY_DUPLICATE_DOCUMENT,IdentityFeedbackService.type("REVIEW_REQUIRED","Trùng số CCCD với hồ sơ đã có.",false));
  assertEquals(NotificationType.IDENTITY_DUPLICATE_FACE,IdentityFeedbackService.type("REVIEW_REQUIRED","Trùng khuôn mặt với hồ sơ đã có.",false));
  assertEquals(NotificationType.IDENTITY_DUPLICATE_BOTH,IdentityFeedbackService.type("REVIEW_REQUIRED","Trùng số CCCD và trùng khuôn mặt với hồ sơ đã có.",false));
  assertEquals(NotificationType.IDENTITY_ACTION_REQUIRED,IdentityFeedbackService.type("ERROR","Dịch vụ chưa sẵn sàng",false));
  assertEquals(NotificationType.IDENTITY_REJECTED,IdentityFeedbackService.type("REJECTED","Ảnh chưa rõ",true));
  assertEquals(NotificationType.IDENTITY_APPROVED,IdentityFeedbackService.type("VERIFIED","Đã duyệt",true));
 }
 @Test void noticeTargetsOwnerProfileAndDeduplicatesIdenticalImmediateRetries(){
  var users=mock(UserRepository.class);var records=mock(NotificationRepository.class);var notifications=mock(NotificationService.class);
  var user=User.builder().id(UUID.randomUUID()).build();when(users.findById(user.getId())).thenReturn(Optional.of(user));
  var feedback=new IdentityFeedbackService(users,records,notifications);feedback.send(user.getId(),"REJECTED","Ảnh chưa rõ",true);
  verify(notifications).create(user,NotificationType.IDENTITY_REJECTED,"Hồ sơ xác minh bị từ chối","Ảnh chưa rõ",user.getId(),"/profile?identity=1");
  when(records.existsByRecipient_IdAndTypeAndMessageAndCreatedAtAfter(any(),any(),anyString(),any())).thenReturn(true);
  feedback.send(user.getId(),"REJECTED","Ảnh chưa rõ",true);verifyNoMoreInteractions(notifications);
 }
}
