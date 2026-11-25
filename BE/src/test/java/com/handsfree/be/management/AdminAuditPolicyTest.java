package com.handsfree.be.management;
import com.handsfree.be.serviceImpl.AdminAuditPolicy;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class AdminAuditPolicyTest {
 @Test void consequentialChangesAreKeptAndRoutineClaimsAreNotStored() {
  assertTrue(AdminAuditPolicy.shouldStore("ADMIN_WALLET_CREDIT"));
  assertTrue(AdminAuditPolicy.shouldStore("USER_ACCESS"));
  assertFalse(AdminAuditPolicy.shouldStore("REPORT_CLAIM"));
  assertFalse(AdminAuditPolicy.shouldStore("IDENTITY_RELEASE"));
  assertTrue(AdminAuditPolicy.shouldStore("IDENTITY_IMAGE_VIEW"));
  assertFalse(AdminAuditPolicy.IMPORTANT.contains("IDENTITY_IMAGE_VIEW"));
 }
 @Test void legacySettingsBecomeBusinessLanguage() {
  var text=AdminAuditPolicy.describe("MATCHING_REQUIREMENTS_SETTINGS","enabled=false");
  assertTrue(text.contains("Đã tắt"));assertTrue(text.contains("Phí kết nối vẫn áp dụng"));assertFalse(text.contains("enabled="));
 }
 @Test void actorAndSubjectAreNotConfusedAndReasonIsPreserved() {
  var text=AdminAuditPolicy.describe("USER_ACCESS","5c49040f-8a2d-45d1-ae52-59eab217dcde role=STAFF active=false Cần kiểm tra");
  assertTrue(text.contains("ID tài khoản liên quan"));assertTrue(text.contains("Nhân viên"));assertTrue(text.contains("Đã khóa"));assertTrue(text.contains("Lý do: Cần kiểm tra"));
 }
 @Test void amountsAndDatesAreReadableAndUnknownDiagnosticsAreNotReturned() {
  assertTrue(AdminAuditPolicy.describe("ADMIN_WALLET_CREDIT","amount=50000 | Hỗ trợ").contains("50.000 đ"));
  assertTrue(AdminAuditPolicy.describe("MATCH_SCHEDULE_CHANGE","newStart=2026-01-01T08:00").contains("01/01/2026 08:00"));
  assertFalse(AdminAuditPolicy.describe("UNKNOWN","java.lang.Exception private=data").contains("Exception"));
 }
}
