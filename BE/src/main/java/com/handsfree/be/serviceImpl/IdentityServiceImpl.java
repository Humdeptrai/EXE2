package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.ManagementService;
import com.handsfree.be.entity.IdentityVerification;
import com.handsfree.be.entity.IdentitySubmission;
import com.handsfree.be.repository.*;
import com.handsfree.be.properties.IdentityProperties;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class IdentityServiceImpl implements com.handsfree.be.service.IdentityService {
    private final IdentityRepository identities;
    private final IdentitySubmissionRepository submissions;
    private final IdentityAppealRepository appeals;
    private final com.handsfree.be.service.NotificationService notifications;
    private static final List<String> OPEN_APPEALS = List.of("REQUESTED", "PROCESSING");
    private final UserRepository users;
    private final AccountAccess access;
    private final IdentityProperties properties;
    private final IdentityCrypto crypto;
    private final FptIdentityClient provider;
    private final TransactionTemplate transactions;
    private final JobMatchRepository matches;
    private final ContactAccess contacts;
    private final ManagementService management;


    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Eligibility eligibility(UUID user) {
        var account = access.active(user);
        List<String> missing = new ArrayList<>();
        if (!org.springframework.util.StringUtils.hasText(account.getFullName())) missing.add("Họ tên");
        if (account.getPhone() == null || !account.getPhone().trim().matches("0[0-9]{9}")) missing.add("Số điện thoại hợp lệ");
        if (!org.springframework.util.StringUtils.hasText(account.getLocation())) missing.add("Nơi ở / khu vực");
        boolean profileComplete = missing.isEmpty();
        var record = identities.findStateByUserId(user);
        String state = record.map(IdentityRepository.State::getStatus).orElse("NOT_SUBMITTED");
        boolean verified = "VERIFIED".equals(state);
        boolean selfie = verified && record.map(IdentityRepository.State::getSelfieVerifiedAt).isPresent();
        boolean document = verified && record.map(IdentityRepository.State::getDocumentNumberConfirmedAt).isPresent();
        if (!verified) missing.add("Xác minh khuôn mặt và CCCD");
        if (!selfie) missing.add("Selfie trực tiếp đã xác minh");
        if (!document) missing.add("Số CCCD đã xác nhận");
        return new Eligibility(profileComplete && verified && selfie && document, profileComplete, verified,
                state, List.copyOf(missing), selfie, document);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void storeScan(UUID user, ScanSubmission data) {
        var account = users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!account.isActive()) throw new AppException(ErrorCode.USER_DISABLED);
        requireNoOpenAppeal(user);
        if (data.selfie() == null || data.selfie().length == 0 || !validNumber(data.documentNumber()))
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        var active = identities.findById(user).orElseGet(() -> { var n = new IdentityVerification(); n.setUserId(user); return n; });
        if ("PROCESSING".equals(active.getStatus()) && active.getSubmittedAt() != null
                && active.getSubmittedAt().isAfter(Instant.now().minusSeconds(300))) throw new AppException(ErrorCode.IDENTITY_BUSY);
        var draft = submissions.findById(user).orElseGet(() -> { var n = new IdentitySubmission(); n.setUserId(user); return n; });
        Instant now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        draft.setStatus(data.similarity()<.30 ? "REJECTED" : "REVIEW_REQUIRED"); draft.setReason(data.reason()); draft.setSubmittedAt(now); draft.setConsentAt(now);
        draft.setFullName(crypto.encrypt(data.fullName())); draft.setDocumentNumber(crypto.encrypt(data.documentNumber()));
        draft.setDocumentData(crypto.encrypt(data.evidence())); draft.setFrontImage(crypto.encrypt(data.front()));
        draft.setBackImage(crypto.encrypt(data.back())); draft.setFaceImage(crypto.encrypt(data.face()));
        draft.setSelfieImage(crypto.encrypt(data.selfie())); draft.setSelfieVerifiedAt(now);
        draft.setDocumentNumberConfirmedAt(null); draft.setSimilarity(data.similarity()); draft.setLive(true);
        if (data.approved()) {
            publish(active, draft, data.fullName(), data.reason());
            identities.saveAndFlush(active);
            if (submissions.existsById(user)) submissions.deleteById(user);
        } else {
            submissions.saveAndFlush(draft);
            if (!"VERIFIED".equals(active.getStatus())) {
                active.setStatus(draft.getStatus()); active.setSubmittedAt(now); active.setReason(data.reason());
                active.setVerifiedAt(null); active.setSelfieVerifiedAt(null); active.setDocumentNumberConfirmedAt(null);
                identities.saveAndFlush(active);
            }
        }
    }

    private void publish(IdentityVerification active, IdentitySubmission draft, String name, String reason) {
        active.setStatus("VERIFIED"); active.setReason(reason); active.setSubmittedAt(draft.getSubmittedAt());
        active.setVerifiedAt(Instant.now()); active.setConsentAt(draft.getConsentAt());
        active.setFullName(crypto.encrypt(name)); active.setDocumentData(draft.getDocumentData());
        active.setFrontImage(draft.getFrontImage()); active.setBackImage(draft.getBackImage()); active.setFaceImage(draft.getFaceImage());
        active.setSelfieImage(draft.getSelfieImage()); active.setSelfieVerifiedAt(Instant.now());
        active.setDocumentNumber(draft.getDocumentNumber()); active.setDocumentNumberConfirmedAt(Instant.now());
        active.setSimilarity(draft.getSimilarity()); active.setLive(draft.getLive());
    }

    private boolean validNumber(String value) { return value != null && value.matches("[0-9]{12}"); }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public Status review(UUID actor, UUID user, Review request) {
        access.operator(actor, true);
        users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        var active = get(user);
        var openAppeal = appeals.findFirstByUserIdAndStatusIn(user, OPEN_APPEALS).orElse(null);
        if (openAppeal != null && (!"PROCESSING".equals(openAppeal.getStatus()) || !actor.equals(openAppeal.getClaimedBy())))
            throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        var draft = submissions.lockById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT));
        if (request == null || request.submittedAt() == null || request.version() == null)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        if ((!"REVIEW_REQUIRED".equals(draft.getStatus()) && !"REJECTED".equals(draft.getStatus())) || !request.submittedAt().equals(draft.getSubmittedAt()) || request.version() != draft.getVersion())
            throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        String name = request.fullName() == null ? "" : request.fullName().trim();
        String reason = request.reason() == null ? "" : request.reason().trim();
        if (reason.isEmpty() || reason.length() > 500 || (request.approved() && (name.length() < 2 || name.length() > 100))
                || (!request.approved() && reason.isEmpty())) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (request.approved()) {
            if (draft.getSelfieImage() == null || draft.getSelfieVerifiedAt() == null || draft.getFaceImage() == null
                    || draft.getFrontImage() == null || draft.getBackImage() == null || !Boolean.TRUE.equals(draft.getLive())
                    || !validNumber(crypto.text(draft.getDocumentNumber()))) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            publish(active, draft, name, "ADMIN đã duyệt: " + reason.substring(0, Math.min(reason.length(),480)));
            identities.saveAndFlush(active); submissions.delete(draft);
        } else {
            draft.setStatus("REJECTED"); draft.setReason(reason);
            if (!"VERIFIED".equals(active.getStatus())) {
                active.setStatus("REJECTED"); active.setReason(reason); identities.saveAndFlush(active);
            }
            submissions.saveAndFlush(draft);
        }
        if (openAppeal != null) {
            openAppeal.setStatus(request.approved() ? "RESOLVED" : "REJECTED");
            openAppeal.setReason(reason); openAppeal.setResolvedAt(Instant.now()); appeals.saveAndFlush(openAppeal);
            notifications.create(users.findById(user).orElseThrow(), com.handsfree.be.constant.NotificationType.IDENTITY_REVIEWED,
                request.approved() ? "Hồ sơ xác minh đã được duyệt" : "Yêu cầu xác minh chưa được duyệt",
                reason, openAppeal.getId(), "/identity/requests/" + openAppeal.getId());
        }
        management.log(actor, request.approved() ? "IDENTITY_APPROVE" : "IDENTITY_REJECT", user.toString());
        return summary(active);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public MyIdentity mine(UUID user) {
        access.active(user);
        var active = identities.findById(user).orElse(null);
        var draft = submissions.findById(user).orElse(null);
        boolean useActive = active != null && "VERIFIED".equals(active.getStatus())
                && active.getSelfieImage() != null && active.getDocumentNumber() != null;
        boolean replacement = draft != null && active != null && "VERIFIED".equals(active.getStatus());
        if (!useActive && draft != null) return new MyIdentity(draftStatus(draft), crypto.text(draft.getDocumentNumber()), false,
                draft.getSelfieImage() != null, false, draft.getSelfieImage() == null ? null : "/identity/me/selfie", replacement);
        if (active == null) return new MyIdentity(status(user), null, false, false, false, null, false);
        return new MyIdentity(summary(active), crypto.text(active.getDocumentNumber()), useActive && active.getDocumentNumberConfirmedAt() != null,
                active.getSelfieImage() != null, useActive && active.getSelfieVerifiedAt() != null,
                active.getSelfieImage() == null ? null : "/identity/me/selfie", replacement);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] ownSelfie(UUID user) {
        access.active(user);
        var active = get(user);
        if ("VERIFIED".equals(active.getStatus()) && active.getSelfieImage() != null) return crypto.decrypt(active.getSelfieImage());
        var draft = submissions.findById(user).orElse(null);
        byte[] image = draft != null ? draft.getSelfieImage() : active.getSelfieImage();
        if (image == null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        return crypto.decrypt(image);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public Dossier correctDocument(UUID actor, UUID user, DocumentCorrection request) {
        access.operator(actor, true);
        if (request == null || !validNumber(request.documentNumber()) || request.version() == null
                || request.reason() == null || request.reason().isBlank() || request.reason().length() > 300)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        var openAppeal = appeals.findFirstByUserIdAndStatusIn(user, OPEN_APPEALS).orElse(null);
        if (openAppeal != null && (!"PROCESSING".equals(openAppeal.getStatus()) || !actor.equals(openAppeal.getClaimedBy())))
            throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        var draft = submissions.lockById(user).orElse(null);
        String previous;
        if (request.pending()) {
            if (draft == null || draft.getVersion() != request.version()) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            previous = crypto.text(draft.getDocumentNumber()); draft.setDocumentNumber(crypto.encrypt(request.documentNumber()));
            submissions.saveAndFlush(draft);
        } else {
            if (draft != null) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            var active = get(user);
            if (active.getVersion() != request.version() || !"VERIFIED".equals(active.getStatus()))
                throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            previous = crypto.text(active.getDocumentNumber()); active.setDocumentNumber(crypto.encrypt(request.documentNumber()));
            active.setDocumentNumberConfirmedAt(Instant.now()); identities.saveAndFlush(active);
        }
        management.log(actor, "IDENTITY_DOCUMENT_CORRECTION", user + " " + mask(previous) + " -> "
                + mask(request.documentNumber()) + " | " + request.reason().trim());
        return dossier(actor, user);
    }
    private String mask(String value) { return value == null || value.length() < 4 ? "none" : "********" + value.substring(value.length()-4); }
    private Status draftStatus(IdentitySubmission draft) {
        return new Status(draft.getUserId(), draft.getStatus(), draft.getReason(), draft.getSubmittedAt(), null, properties.isEnabled());
    }

    public Status status(UUID user) {
        access.active(user);
        return identities.findStateByUserId(user).map(this::summary)
                .orElse(new Status(user, "NOT_SUBMITTED", null, null, null, properties.isEnabled()));
    }
    public Status summary(IdentityVerification i) {
        return new Status(i.getUserId(), i.getStatus(), i.getReason(), i.getSubmittedAt(), i.getVerifiedAt(), properties.isEnabled());
    }
    public Status summary(IdentityRepository.State i) {
        return new Status(i.getUserId(), i.getStatus(), i.getReason(), i.getSubmittedAt(), i.getVerifiedAt(), properties.isEnabled());
    }
    public void requireVerified(UUID user) {
        var eligibility = eligibility(user);
        if (!eligibility.identityVerified() || !eligibility.selfieVerified() || !eligibility.documentConfirmed()) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        if (!eligibility.profileComplete()) throw new AppException(ErrorCode.PROFILE_REQUIRED);
    }
    public Status submit(UUID user, MultipartFile front, MultipartFile back, MultipartFile face, MultipartFile video, boolean consent) {
        access.active(user);
        requireNoOpenAppeal(user);
        if (!consent) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (!properties.isEnabled() || properties.getApiKey().isBlank()) throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED);
        crypto.validateKey();
        byte[] f = jpeg(front), b = jpeg(back), s = jpeg(face), v = video(video);
        Instant attempt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Status existing = transactions.execute(tx -> {
            users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            requireNoOpenAppeal(user);
            var i = identities.findById(user).orElseGet(() -> { var n = new IdentityVerification(); n.setUserId(user); return n; });
            if ("VERIFIED".equals(i.getStatus())) return summary(i);
            if (i.getSubmittedAt() != null && i.getSubmittedAt().isAfter(attempt.minusSeconds("PROCESSING".equals(i.getStatus()) ? 300 : 60)))
                throw new AppException(ErrorCode.IDENTITY_BUSY);
            if (submissions.existsById(user)) submissions.deleteById(user);
            i.setSelfieImage(null); i.setSelfieVerifiedAt(null); i.setDocumentNumber(null); i.setDocumentNumberConfirmedAt(null);
            i.setStatus("PROCESSING"); i.setSubmittedAt(attempt); i.setConsentAt(attempt); i.setReason("Đang đối chiếu hồ sơ");
            i.setFullName(null); i.setDocumentData(null); i.setSimilarity(null); i.setLive(null); i.setVerifiedAt(null);
            i.setFrontImage(crypto.encrypt(f)); i.setBackImage(crypto.encrypt(b)); i.setFaceImage(crypto.encrypt(s));
            identities.saveAndFlush(i); return null;
        });
        if (existing != null) return existing;
        FptIdentityClient.Result result;
        try { result = provider.verify(f, b, s, v); }
        catch (Exception e) {
            transactions.executeWithoutResult(tx -> identities.lockById(user).ifPresent(i -> {
                if (attempt.equals(i.getSubmittedAt())) { i.setStatus("ERROR"); i.setReason("Dịch vụ xác thực chưa sẵn sàng. Vui lòng gửi lại sau."); }
            }));
            throw e;
        }
        return transactions.execute(tx -> {
            var i = identities.lockById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND));
            if (!attempt.equals(i.getSubmittedAt())) throw new AppException(ErrorCode.IDENTITY_BUSY);
            i.setStatus(result.verified() ? "VERIFIED" : "REJECTED"); i.setReason(result.reason());
            i.setVerifiedAt(result.verified() ? Instant.now() : null);
            i.setFullName(crypto.encrypt(result.name())); i.setDocumentData(crypto.encrypt(result.document()));
            i.setSimilarity(result.similarity()); i.setLive(result.live());
            return summary(i);
        });
    }
    public Dossier dossier(UUID actor, UUID user) {
        access.operator(actor, true);
        var i = get(user);
        var draft = submissions.findById(user).orElse(null);
        management.log(actor, "IDENTITY_VIEW", user.toString());
        if (draft != null) return new Dossier(draftStatus(draft), crypto.text(draft.getFullName()), crypto.text(draft.getDocumentData()),
                draft.getSimilarity(), draft.getLive(), crypto.text(draft.getDocumentNumber()), true, draft.getVersion(),
                draft.getSelfieImage() != null, "VERIFIED".equals(i.getStatus()));
        return new Dossier(summary(i), crypto.text(i.getFullName()), crypto.text(i.getDocumentData()), i.getSimilarity(), i.getLive(),
                crypto.text(i.getDocumentNumber()), false, i.getVersion(), i.getSelfieImage() != null, "VERIFIED".equals(i.getStatus()));
    }
    public byte[] adminImage(UUID actor, UUID user, String kind) {
        access.operator(actor, true);
        var i = get(user);
        var d = submissions.findById(user).orElse(null);
        byte[] data = switch(kind) { case "front" -> d != null ? d.getFrontImage() : i.getFrontImage();
            case "back" -> d != null ? d.getBackImage() : i.getBackImage(); case "face" -> d != null ? d.getFaceImage() : i.getFaceImage();
            case "selfie" -> d != null ? d.getSelfieImage() : i.getSelfieImage(); default -> throw new AppException(ErrorCode.FORBIDDEN); };
        if (data == null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        management.log(actor, "IDENTITY_IMAGE_VIEW", user + " " + kind);
        return crypto.decrypt(data);
    }
    public byte[] verifiedFace(UUID user) {
        var i = get(user);
        if (!"VERIFIED".equals(i.getStatus()) || i.getSelfieImage() == null || i.getSelfieVerifiedAt() == null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        return crypto.decrypt(i.getSelfieImage());
    }
    @Override public com.handsfree.be.dto.response.PageResponse<Status> list(UUID actor, int page) {
        access.operator(actor, false);
        return com.handsfree.be.dto.response.PageResponse.from(identities.findReviewQueue(org.springframework.data.domain.PageRequest.of(Math.max(page, 0), 20)).map(i -> {
                var pending = submissions.findStateByUserId(i.getUserId());
                return pending.map(d -> new Status(i.getUserId(), d.getStatus(), d.getReason(), d.getSubmittedAt(), null, properties.isEnabled()))
                        .orElseGet(() -> summary(i));
            }));
    }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] counterpartFace(UUID actor, UUID match) {
        access.active(actor);
        var m = matches.findById(match).orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        if (!m.getConsumer().getId().equals(actor) && !m.getProvider().getId().equals(actor)) throw new AppException(ErrorCode.MATCH_NOT_FOUND);
        if (!contacts.unlocked(m)) throw new AppException(ErrorCode.CHAT_NOT_UNLOCKED);
        UUID other = m.getConsumer().getId().equals(actor) ? m.getProvider().getId() : m.getConsumer().getId();
        return verifiedFace(other);
    }
    @Override public void requireNoOpenAppeal(UUID user) {
        if (appeals.existsByUserIdAndStatusIn(user, OPEN_APPEALS)) throw new AppException(ErrorCode.IDENTITY_APPEAL_BUSY);
    }
    private Appeal appealSummary(com.handsfree.be.entity.IdentityAppeal a) {
        return new Appeal(a.getId(), a.getUserId(), a.getStatus(), a.getNote(), a.getReason(), a.getCreatedAt(),
            a.getResolvedAt(), a.getClaimedBy(), a.getClaimedAt(), crypto.text(a.getFullName()),
            crypto.text(a.getDocumentNumber()), a.getSimilarity(), crypto.text(a.getDocumentData()));
    }
    @Override @org.springframework.transaction.annotation.Transactional
    public Appeal requestReview(UUID user, AppealRequest request) {
        if (access.active(user).getRole()!=com.handsfree.be.constant.UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN);
        users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        var existing=appeals.findFirstByUserIdAndStatusIn(user,OPEN_APPEALS);
        if(existing.isPresent()) return appealSummary(existing.get());
        var d=submissions.lockById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_REQUIRED));
        var latest=appeals.findFirstByUserIdOrderByCreatedAtDesc(user).orElse(null);
        if(latest!=null && Objects.equals(latest.getSubmissionAt(),d.getSubmittedAt()))
            throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        if(!List.of("REVIEW_REQUIRED","REJECTED").contains(d.getStatus()) || d.getSelfieImage()==null
                || d.getFaceImage()==null || d.getFrontImage()==null || d.getBackImage()==null || !Boolean.TRUE.equals(d.getLive()))
            throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        String note=request==null || request.note()==null ? "" : request.note().trim();
        if(note.length()>500) throw new AppException(ErrorCode.VALIDATION_FAILED);
        var a=new com.handsfree.be.entity.IdentityAppeal();a.setUserId(user);a.setStatus("REQUESTED");a.setNote(note);
        a.setCreatedAt(Instant.now());a.setSubmissionAt(d.getSubmittedAt());a.setSimilarity(d.getSimilarity());
        a.setFullName(d.getFullName());a.setDocumentNumber(d.getDocumentNumber());a.setDocumentData(d.getDocumentData());
        a.setFrontImage(d.getFrontImage());a.setBackImage(d.getBackImage());a.setFaceImage(d.getFaceImage());a.setSelfieImage(d.getSelfieImage());
        appeals.saveAndFlush(a);return appealSummary(a);
    }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public Appeal latestAppeal(UUID user) {
        access.active(user);return appeals.findFirstByUserIdOrderByCreatedAtDesc(user).map(this::appealSummary).orElse(null);
    }
    private com.handsfree.be.entity.IdentityAppeal accessibleAppeal(UUID actor, UUID id) {
        var a=appeals.findById(id).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND));
        if(!a.getUserId().equals(actor)) access.operator(actor,true);else access.active(actor);
        return a;
    }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public Appeal appeal(UUID actor, UUID id) { return appealSummary(accessibleAppeal(actor,id)); }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public byte[] appealImage(UUID actor, UUID id, String kind) {
        var a=accessibleAppeal(actor,id);
        byte[] bytes=switch(kind) {case "front" -> a.getFrontImage();case "back" -> a.getBackImage();
            case "face" -> a.getFaceImage();case "selfie" -> a.getSelfieImage();default -> null;};
        if(bytes==null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        return crypto.decrypt(bytes);
    }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public com.handsfree.be.dto.response.PageResponse<Appeal> appeals(UUID actor,int page,String state,String search) {
        access.operator(actor,true);
        if(state==null || !List.of("","REQUESTED","PROCESSING","RESOLVED","REJECTED").contains(state)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if(search==null || search.length()>100) throw new AppException(ErrorCode.VALIDATION_FAILED);
        return com.handsfree.be.dto.response.PageResponse.from(appeals.search(state,search.trim().toLowerCase(Locale.ROOT),
            org.springframework.data.domain.PageRequest.of(Math.max(0,page),20)).map(a -> new Appeal(a.getId(),a.getUserId(),a.getStatus(),a.getNote(),a.getReason(),a.getCreatedAt(),a.getResolvedAt(),a.getClaimedBy(),a.getClaimedAt(),null,null,a.getSimilarity(),null)));
    }
    private com.handsfree.be.entity.IdentityAppeal lockedAppeal(UUID actor,UUID id) {
        access.operator(actor,true);
        UUID owner=appeals.findOwner(id).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND));
        users.lockById(owner).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return appeals.lockById(id).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND));
    }
    @Override @org.springframework.transaction.annotation.Transactional
    public Appeal claimAppeal(UUID actor,UUID id,boolean release) {
        var a=lockedAppeal(actor,id);
        if(release) {
            if(!"PROCESSING".equals(a.getStatus()) || !actor.equals(a.getClaimedBy())) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            a.setStatus("REQUESTED");a.setClaimedBy(null);a.setClaimedAt(null);
        } else {
            if("PROCESSING".equals(a.getStatus()) && actor.equals(a.getClaimedBy())) return appealSummary(a);
            if(!"REQUESTED".equals(a.getStatus())) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
            a.setStatus("PROCESSING");a.setClaimedBy(actor);a.setClaimedAt(Instant.now());
        }
        appeals.saveAndFlush(a);management.log(actor,release?"IDENTITY_RELEASE":"IDENTITY_CLAIM",id.toString());return appealSummary(a);
    }
    @Override @org.springframework.transaction.annotation.Transactional
    public Appeal resolveAppeal(UUID actor,UUID id,Review request) {
        var a=lockedAppeal(actor,id);
        if(!"PROCESSING".equals(a.getStatus()) || !actor.equals(a.getClaimedBy())) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        var d=submissions.lockById(a.getUserId()).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT));
        if(!Objects.equals(a.getSubmissionAt(),d.getSubmittedAt()) || request==null) throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        review(actor,a.getUserId(),new Review(request.approved(),d.getSubmittedAt(),request.fullName(),request.reason(),d.getVersion()));
        return appealSummary(a);
    }
    private IdentityVerification get(UUID user) { return identities.findById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND)); }
    private byte[] jpeg(MultipartFile file) {
        try {
            if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024 || !"image/jpeg".equals(file.getContentType()))
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            byte[] raw = file.getBytes();
            if (raw.length < 3 || (raw[0] & 255) != 255 || (raw[1] & 255) != 216) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            java.awt.image.BufferedImage image;
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(raw))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 640 || height < 480 || width > 5000 || height > 5000)
                        throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
                    image = reader.read(0);
                } finally { reader.dispose(); }
            }
            if (image == null) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            // Re-encode: discard EXIF (including GPS), keep a safe JPEG to serve privately.
            var output = new ByteArrayOutputStream(); ImageIO.write(image, "jpg", output);
            if (output.size() > 5 * 1024 * 1024) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            return output.toByteArray();
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA); }
    }
    private byte[] video(MultipartFile file) {
        try {
            if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024 || !"video/mp4".equals(file.getContentType()))
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            byte[] raw = file.getBytes();
            if (raw.length < 12 || raw[4] != 'f' || raw[5] != 't' || raw[6] != 'y' || raw[7] != 'p')
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            return raw;
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA); }
    }
}
