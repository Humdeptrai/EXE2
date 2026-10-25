package com.handsfree.be.serviceImpl;
import com.handsfree.be.service.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.constant.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.math.BigDecimal;
import java.time.Instant;
@Service @RequiredArgsConstructor
public class AdminWalletServiceImpl implements AdminWalletService {
 private final AccountAccess access;private final UserRepository users;private final WalletTopUpRepository topups;
 private final AdminWalletCreditRepository credits;private final WalletEntryRepository entries;private final ModerationReportRepository reports;
 private final ManagementService management;private final NotificationService notifications;private final WalletService wallet;
 private Receipt receipt(AdminWalletCredit c){return new Receipt(c.getRequestId(),c.getOwnerId(),c.getAmount(),c.getBalanceAfter(),c.getOrderCode());}
 private Receipt retry(AdminWalletCredit prior,UUID actor,UUID user,Credit request){
  if(!prior.getActorId().equals(actor)||!prior.getOwnerId().equals(user)||prior.getAmount().compareTo(request.amount())!=0||!prior.getReason().equals(request.reason().trim())||!Objects.equals(prior.getOrderCode(),request.orderCode())||!Objects.equals(prior.getReportId(),request.reportId()))throw new AppException(ErrorCode.PAYMENT_MISMATCH);
  return receipt(prior);
 }
 @Transactional public Receipt credit(UUID actor,UUID owner,Credit request) {
  access.operator(actor,true);
  if(request==null||request.requestId()==null||request.amount()==null||request.amount().scale()>0||request.amount().signum()<=0||request.amount().compareTo(new BigDecimal("100000000"))>0||request.reason()==null||request.reason().trim().length()<10||request.reason().length()>1000)throw new AppException(ErrorCode.VALIDATION_FAILED);
  var prior=credits.findById(request.requestId()).orElse(null);if(prior!=null)return retry(prior,actor,owner,request);
  if(request.reportId()!=null){var report=reports.lockById(request.reportId()).orElseThrow(()->new AppException(ErrorCode.REPORT_NOT_FOUND));if(!report.getReporterId().equals(owner)||!"SUPPORT".equals(report.getTargetType())||!"IN_REVIEW".equals(report.getStatus())||!actor.equals(report.getAssignedTo()))throw new AppException(ErrorCode.REPORT_CLAIM_REQUIRED);}
  WalletTopUp order=request.orderCode()==null?null:topups.lockById(request.orderCode()).orElseThrow(()->new AppException(ErrorCode.PAYMENT_MISMATCH));
  var user=users.lockById(owner).orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
  if(user.getRole()!=UserRole.USER)throw new AppException(ErrorCode.FORBIDDEN);
  prior=credits.findById(request.requestId()).orElse(null);if(prior!=null)return retry(prior,actor,owner,request);
  if(order!=null){
   if(!order.getOwnerId().equals(owner)||order.getAmount().compareTo(request.amount())!=0||order.getCreditedAt()!=null)throw new AppException(ErrorCode.PAYMENT_MISMATCH);
   // Settle the SAME order/ledger key: later payOS webhook/reconciliation cannot credit twice.
   wallet.settle(order.getOrderCode(),order.getPaymentLinkId(),request.amount(),"PAID");
  }else{
   user.setWalletBalance(user.getWalletBalance().add(request.amount()));
   entries.save(WalletEntry.builder().ownerId(owner).amount(request.amount()).balanceAfter(user.getWalletBalance()).kind("ADMIN_CREDIT")
    .dedupeKey("ADMIN_CREDIT:"+request.requestId()).description("ADMIN cộng tiền có đối soát · "+request.requestId()).occurredAt(Instant.now()).build());
  }
  var c=new AdminWalletCredit();c.setRequestId(request.requestId());c.setActorId(actor);c.setOwnerId(owner);c.setAmount(request.amount());c.setBalanceAfter(user.getWalletBalance());c.setReason(request.reason().trim());c.setOrderCode(request.orderCode());c.setReportId(request.reportId());c.setCreatedAt(Instant.now());credits.saveAndFlush(c);
  management.log(actor,"ADMIN_WALLET_CREDIT","user="+owner+" amount="+request.amount()+" order="+request.orderCode()+" report="+request.reportId()+" request="+request.requestId()+" | "+request.reason().trim());
  notifications.create(user,NotificationType.PAYMENT_RECEIVED,"Ví đã được cộng tiền","Bộ phận quản trị đã cộng "+java.text.NumberFormat.getIntegerInstance(java.util.Locale.forLanguageTag("vi-VN")).format(request.amount())+"đ vào ví. Mở ví để xem lịch sử.",request.requestId(),"/wallet");
  return receipt(c);
 }
}
