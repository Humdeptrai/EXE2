package com.handsfree.be.serviceImpl;

import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.time.Instant;

@Service @RequiredArgsConstructor @Transactional
public class IdentityRegistryServiceImpl implements IdentityRegistryService {
 private final IdentityClaimRepository claims;
 private final IdentityRegistryLockRepository mutex;
 private final IdentityRepository identities;
 private final IdentitySubmissionRepository submissions;
 private final IdentityCrypto crypto;
 private final FaceWorkerClient worker;
 private final AccountAccess access;
 private final UserRepository users;
 private final NotificationService notifications;
 private final ObjectMapper json;
 private final ManagementService management;
 @Value("${IDENTITY_DUPLICATE_FACE_THRESHOLD:0.55}") private double faceThreshold;
 public Evidence evidence(UUID actor,UUID user) {
  access.operator(actor,true);var i=identities.findReadModel(user).orElseThrow(()->new AppException(ErrorCode.IDENTITY_NOT_FOUND));
  management.log(actor,"IDENTITY_CONFLICT_EVIDENCE_VIEW",user.toString());
  return new Evidence(users.findNameById(user).map(UserRepository.Name::getFullName).orElse(""),i.getStatus(),crypto.text(i.getFullName()),crypto.text(i.getDocumentNumber()));
 }
 public byte[] image(UUID actor,UUID user,String kind) {
  access.operator(actor,true);if(!Set.of("face","selfie","front","back").contains(kind))throw new AppException(ErrorCode.VALIDATION_FAILED);
  var i=identities.findImageData(user,kind).orElseThrow(()->new AppException(ErrorCode.IDENTITY_NOT_FOUND));
  if(i.getData()==null)throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
  management.log(actor,"IDENTITY_CONFLICT_IMAGE_VIEW",user+" "+kind);return crypto.decrypt(i.getData());
 }
 public Assessment inspect(UUID actor,UUID user) {
  access.operator(actor,true);var draft=submissions.findById(user).orElse(null);var active=identities.findById(user).orElse(null);
  if(draft==null && active==null)throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
  String number=crypto.text(draft!=null?draft.getDocumentNumber():active.getDocumentNumber());
  String evidence=crypto.text(draft!=null?draft.getDocumentData():active.getDocumentData());
  if(number==null)return new Assessment(false,"Chưa có số CCCD để kiểm tra.",List.of());
  management.log(actor,"IDENTITY_CONFLICT_VIEW",user.toString());return assess(user,number,evidence);
 }
 @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY) public void lock() { mutex.lock().orElseThrow(() -> new AppException(ErrorCode.IDENTITY_REGISTRY_NOT_READY)); }
 private void syncNumbers() {
  var byKey=new HashMap<String,IdentityClaim>();claims.findAll().forEach(c->byKey.put(c.getDocumentKey(),c));
  for(var row:identities.findRegistryNumbers()) {
   String number=crypto.text(row.getDocumentNumber());
   if(number==null || !number.matches("[0-9]{12}")) continue;
   String key=crypto.fingerprint(number);
   var prior=byKey.get(key);
   if(prior==null) {var c=new IdentityClaim();c.setDocumentKey(key);c.setOwnerId(row.getUserId());c.setCreatedAt(Instant.now());claims.saveAndFlush(c);byKey.put(key,c);}
   else if(!prior.getOwnerId().equals(row.getUserId())) {prior.setLegacyConflict(true);claims.save(prior);}
  }
 }
 private String digest(String evidence,String field) {try{String v=json.readTree(evidence).path(field).asString("");return v.matches("[a-f0-9]{64}")?v:null;}catch(Exception e){return null;}}
 private double[] vector(String evidence) {
  try {
   var r=json.readTree(evidence);
   if(!"sface-2021dec-128".equals(r.path("faceModel").asString(""))) return null;
   var a=r.path("faceEmbedding"); if(a.isArray() && a.size()==1 && a.get(0).isArray())a=a.get(0); if(!a.isArray() || a.size()!=128) return null;
   double[] v=new double[128];double norm=0;
   for(int i=0;i<128;i++){v[i]=a.get(i).asDouble(Double.NaN);if(!Double.isFinite(v[i]))return null;norm+=v[i]*v[i];}
   return Double.isFinite(norm)&&norm>0?v:null;
  }catch(Exception e){return null;}
 }
 private byte[] encode(double[] v) {try{return crypto.encrypt(json.writeValueAsString(v));}catch(Exception e){throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);}}
 private double[] decode(byte[] v) {try{return json.readValue(crypto.text(v),double[].class);}catch(Exception e){throw new AppException(ErrorCode.IDENTITY_REGISTRY_NOT_READY);}}
 private double cosine(double[] a,double[] b) {double dot=0,aa=0,bb=0;for(int i=0;i<128;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return dot/Math.sqrt(aa*bb);}
 private Assessment assessment(String key,boolean allowed,String message,List<Conflict> found){var c=claims.findById(key).orElse(null);return new Assessment(allowed,message,List.copyOf(found),c==null?null:c.getOwnerId(),c==null?null:c.getVersion());}
 public Assessment assess(UUID user,String number,String evidence) {
  lock();syncNumbers();String key=crypto.fingerprint(number);var all=claims.findAll();var found=new ArrayList<Conflict>();
  double[] candidate=vector(evidence);boolean incomplete=candidate==null;
  if(!Double.isFinite(faceThreshold) || faceThreshold<.45 || faceThreshold>=1)throw new AppException(ErrorCode.IDENTITY_REGISTRY_NOT_READY);
  for(var c:all) {
   if(c.getDocumentKey().equals(key) && (!c.getOwnerId().equals(user) || c.isLegacyConflict()))found.add(new Conflict(c.getOwnerId(),"DOCUMENT",null));
   if(c.getOwnerId().equals(user)) {
    if(c.getFaceVector()==null)incomplete=true;
    else if(candidate!=null && cosine(candidate,decode(c.getFaceVector()))<faceThreshold)found.add(new Conflict(user,"IDENTITY_CHANGE",cosine(candidate,decode(c.getFaceVector()))));
    continue;
   }
   String front=digest(evidence,"frontDigest"),back=digest(evidence,"backDigest");
   if(front!=null&&front.equals(c.getFrontDigest()) || back!=null&&back.equals(c.getBackDigest()))found.add(new Conflict(c.getOwnerId(),"IMAGE",null));
   if(c.getFaceVector()==null){incomplete=true;continue;}
   if(candidate!=null){double score=cosine(candidate,decode(c.getFaceVector()));if(score>=faceThreshold)found.add(new Conflict(c.getOwnerId(),"FACE",score));}
  }
  if(found.stream().anyMatch(c->c.kind().equals("DOCUMENT")))return assessment(key,false,"Thông tin định danh này đã được sử dụng. Vui lòng khôi phục tài khoản hoặc gửi yêu cầu kiểm tra danh tính nếu có nhầm lẫn.",List.copyOf(found));
  if(!found.isEmpty())return assessment(key,false,"Hồ sơ cần kiểm tra thêm trước khi xác minh. Bạn có thể gửi yêu cầu ADMIN kiểm tra danh tính.",List.copyOf(found));
  if(incomplete)return assessment(key,false,"Hồ sơ cần kiểm tra thêm trước khi xác minh. Bạn có thể gửi yêu cầu ADMIN kiểm tra danh tính.",List.of());
  return assessment(key,true,"",List.of());
 }
 public void claim(UUID user,String number,String evidence,boolean manual,boolean transfer){claim(user,number,evidence,manual,transfer,null,null);}
 public void claim(UUID user,String number,String evidence,boolean manual,boolean transfer,UUID expectedOwner,Long expectedVersion) {
  var assessment=assess(user,number,evidence);String key=crypto.fingerprint(number);var existing=claims.findById(key).orElse(null);
  boolean documentConflict=existing!=null && (!existing.getOwnerId().equals(user)||existing.isLegacyConflict());
  if(transfer && (existing==null || !Objects.equals(expectedOwner,existing.getOwnerId()) || expectedVersion==null || expectedVersion!=existing.getVersion()))throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
  if(documentConflict && (!manual || !transfer))throw new AppException(ErrorCode.IDENTITY_DUPLICATE);
  if(!manual && !assessment.allowed())throw new AppException(ErrorCode.IDENTITY_DUPLICATE);
  if(documentConflict) {
   // Keep accounts, wallet and historic matches; revoke identity eligibility only.
   for(var row:identities.findRegistryNumbers())if(key.equals(crypto.fingerprint(crypto.text(row.getDocumentNumber())))&&!user.equals(row.getUserId())) {
    var old=identities.findById(row.getUserId()).orElseThrow();old.setStatus("REJECTED");old.setVerifiedAt(null);old.setDocumentNumberConfirmedAt(null);
    old.setReason("Quyền sử dụng danh tính đã được ADMIN thu hồi sau khi giải quyết yêu cầu kiểm tra.");identities.save(old);
    var previous=users.findById(old.getUserId()).orElseThrow();notifications.create(previous,com.handsfree.be.constant.NotificationType.IDENTITY_REVIEWED,"Kết quả kiểm tra danh tính","Quyền sử dụng danh tính của tài khoản đã được thu hồi sau khi ADMIN kiểm tra. Mở hồ sơ để xem trạng thái và liên hệ hỗ trợ nếu có nhầm lẫn.",old.getUserId(),"/profile");
   }
  }
  var c=existing==null?new IdentityClaim():existing;c.setDocumentKey(key);c.setOwnerId(user);c.setLegacyConflict(false);
  if(c.getCreatedAt()==null)c.setCreatedAt(Instant.now());double[] v=vector(evidence);if(documentConflict)c.setFaceVector(null);if(v!=null)c.setFaceVector(encode(v));c.setFrontDigest(digest(evidence,"frontDigest"));c.setBackDigest(digest(evidence,"backDigest"));claims.saveAndFlush(c);
 }
 @Transactional public Backfill backfill(UUID actor) {
  access.operator(actor,true);lock();syncNumbers();int processed=0,attempted=0;var needsReview=new ArrayList<UUID>();
  for(var c:claims.findAll().stream().sorted(Comparator.comparing(IdentityClaim::getIndexAttemptAt,Comparator.nullsFirst(Comparator.naturalOrder()))).toList())if(c.getFaceVector()==null && attempted<5) {
   attempted++;c.setIndexAttemptAt(Instant.now());claims.save(c);
   var image=identities.findImageData(c.getOwnerId(),"face").orElse(null);
   if(image==null || image.getData()==null) image=identities.findImageData(c.getOwnerId(),"selfie").orElse(null);
   if(image==null || image.getData()==null){needsReview.add(c.getOwnerId());continue;}
   try{
    var r=worker.send("POST","/features",new String[]{"face"},new byte[][]{crypto.decrypt(image.getData())});
    double[] v=vector(r.toString());if(v==null){needsReview.add(c.getOwnerId());continue;}
    c.setFaceVector(encode(v));claims.save(c);processed++;
   }catch(AppException e){if(e.getErrorCode()!=ErrorCode.IDENTITY_SCAN_FAILED)throw e;needsReview.add(c.getOwnerId());}
  }
  long remaining=claims.findAll().stream().filter(c->c.getFaceVector()==null).count();management.log(actor,"IDENTITY_REGISTRY_BACKFILL","processed="+processed+" remaining="+remaining+" needsReview="+needsReview);return new Backfill(processed,remaining,List.copyOf(needsReview));
 }
}
