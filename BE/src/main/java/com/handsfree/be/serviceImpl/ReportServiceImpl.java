package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.dto.request.*;
import com.handsfree.be.dto.response.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.storage.PrivateReportFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {
    private final AccountAccess access;
    private final ContactAccess contactAccess;
    private final ModerationReportRepository reports;
    private final ReportEvidenceRepository evidence;
    private final UserRepository users;
    private final JobPostRepository jobs;
    private final JobMatchRepository matches;
    private final AdminAuditRepository audit;
    private final NotificationService notifications;
    private final ReportEvidenceStorageService storage;
    private static final long IMAGE_LIMIT = 5L * 1024 * 1024;
    private static final long VIDEO_LIMIT = 100L * 1024 * 1024;

    @Override @Transactional
    public ReportResponse create(UUID actor, ReportRequest request, List<MultipartFile> files) {
        User user = access.active(actor);
        String type = request.targetType(); UUID target = request.targetId();
        if (!Set.of("JOB", "USER", "MATCH", "SUPPORT").contains(type)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (type.equals("JOB") && !jobs.existsById(target) || type.equals("USER") && !users.existsById(target)) throw new AppException(ErrorCode.JOB_NOT_FOUND);
        if (type.equals("MATCH") || type.equals("SUPPORT") && !actor.equals(target)) {
            JobMatch match = matches.findById(target).filter(m -> m.getConsumer().getId().equals(actor) || m.getProvider().getId().equals(actor))
                    .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
            if (type.equals("MATCH") && !contactAccess.unlocked(match)) throw new AppException(ErrorCode.REPORT_CONNECTION_REQUIRED);
        }
        List<String> links = validateLinks(request.links());
        List<MultipartFile> attachments = files == null ? List.of() : files;
        validateFiles(attachments);
        ModerationReport report = reports.save(ModerationReport.builder().reporterId(actor).targetType(type).targetId(target)
                .reason(request.reason().trim()).status("OPEN").createdAt(Instant.now()).links(new ArrayList<>(links)).build());
        for (MultipartFile file : attachments) {
            var stored = storage.store(file);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) storage.delete(stored); }
            });
            String name = Objects.requireNonNullElse(file.getOriginalFilename(), "Bằng chứng").replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
            if (name.isBlank()) name = "Bằng chứng";
            if (name.length() > 255) name = name.substring(0, 255);
            evidence.save(ReportEvidence.builder().report(report).originalName(name).contentType(file.getContentType())
                    .sizeBytes(file.getSize()).storageProvider(stored.provider()).storageKey(stored.key()).createdAt(Instant.now()).build());
        }
        return response(report, user, true);
    }
    private List<String> validateLinks(List<String> links) {
        if (links == null) return List.of();
        if (links.size() > 5) throw new AppException(ErrorCode.REPORT_LINK_INVALID);
        return links.stream().map(String::trim).map(value -> {
            try {
                URI uri = URI.create(value);
                if (value.length() > 2000 || uri.getHost() == null || uri.getRawUserInfo() != null
                        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) throw new IllegalArgumentException();
                return value;
            } catch (Exception e) { throw new AppException(ErrorCode.REPORT_LINK_INVALID); }
        }).distinct().toList();
    }
    private void validateFiles(List<MultipartFile> files) {
        int images = 0, videos = 0;
        if (files.size() > 6) throw new AppException(ErrorCode.REPORT_EVIDENCE_INVALID);
        for (MultipartFile file : files) {
            String type = Objects.requireNonNullElse(file.getContentType(), "");
            boolean video = type.equals("video/mp4");
            if (video) videos++; else images++;
            if (file.isEmpty() || !Set.of("image/jpeg", "image/png", "image/webp", "video/mp4").contains(type)
                    || file.getSize() > (video ? VIDEO_LIMIT : IMAGE_LIMIT) || images > 5 || videos > 1)
                throw new AppException(ErrorCode.REPORT_EVIDENCE_INVALID);
            try (var in = file.getInputStream()) {
                byte[] b = in.readNBytes(32);
                boolean valid = switch (type) {
                    case "image/jpeg" -> b.length >= 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216 && (b[2] & 255) == 255;
                    case "image/png" -> b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8), new byte[]{(byte)137,80,78,71,13,10,26,10});
                    case "image/webp" -> b.length >= 12 && new String(b, 0, 4, StandardCharsets.US_ASCII).equals("RIFF") && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
                    default -> b.length >= 12 && new String(b, 4, 4, StandardCharsets.US_ASCII).equals("ftyp")
                            && Set.of("isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "MSNV", "dash", "iso5", "iso6").contains(new String(b, 8, 4, StandardCharsets.US_ASCII));
                };
                if (!valid) throw new AppException(ErrorCode.REPORT_EVIDENCE_INVALID);
            } catch (java.io.IOException e) { throw new AppException(ErrorCode.REPORT_EVIDENCE_INVALID); }
        }
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<ReportResponse> mine(UUID actor, int page) {
        User user = access.active(actor);
        return PageResponse.from(reports.findByReporterIdOrderByCreatedAtDesc(actor, page(page)).map(r -> response(r, user, false)));
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<ReportResponse> list(UUID actor, int page) {
        User user = access.operator(actor, false);
        return PageResponse.from(reports.findAll(page(page)).map(r -> response(r, user, false)));
    }
    private Pageable page(int page) { return PageRequest.of(Math.max(0, page), 20, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))); }
    private ModerationReport readable(User user, UUID id) {
        ModerationReport r = reports.findById(id).orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND));
        if (!r.getReporterId().equals(user.getId()) && user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.STAFF)
            throw new AppException(ErrorCode.REPORT_NOT_FOUND);
        return r;
    }
    @Override @Transactional(readOnly = true)
    public ReportResponse detail(UUID actor, UUID id) { User user = access.active(actor); return response(readable(user, id), user, true); }
    private ModerationReport locked(UUID id) { return reports.lockById(id).orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND)); }
    private void requireOpen(ModerationReport r) {
        if (!Set.of("OPEN", "IN_REVIEW").contains(r.getStatus())) throw new AppException(ErrorCode.REPORT_CLOSED);
    }
    @Override @Transactional
    public ReportResponse claim(UUID actor, UUID id) {
        User user = access.operator(actor, false); ModerationReport r = locked(id); requireOpen(r);
        if (r.getAssignedTo() != null && !actor.equals(r.getAssignedTo())) throw new AppException(ErrorCode.REPORT_ALREADY_ASSIGNED);
        if (!"IN_REVIEW".equals(r.getStatus()) || r.getAssignedTo() == null) {
            r.setAssignedTo(actor); r.setAssignedAt(Instant.now()); r.setStatus("IN_REVIEW");
            log(actor, "REPORT_CLAIM", id.toString());
        }
        return response(r, user, true);
    }
    @Override @Transactional
    public ReportResponse release(UUID actor, UUID id) {
        User user = access.operator(actor, false); ModerationReport r = locked(id); requireOpen(r);
        if (!"IN_REVIEW".equals(r.getStatus()) || r.getAssignedTo() == null) throw new AppException(ErrorCode.REPORT_CLAIM_REQUIRED);
        if (!actor.equals(r.getAssignedTo()) && user.getRole() != UserRole.ADMIN) throw new AppException(ErrorCode.REPORT_ALREADY_ASSIGNED);
        UUID previousAssignee = r.getAssignedTo();
        r.setStatus("OPEN"); r.setAssignedTo(null); r.setAssignedAt(null); r.setResolution(null); r.setResolvedBy(null); r.setResolvedAt(null);
        log(actor, "REPORT_RELEASE", id + " previousAssignee=" + previousAssignee); return response(r, user, true);
    }
    @Override @Transactional
    public ReportResponse resolve(UUID actor, UUID id, ReportResolutionRequest request) {
        if (request.status().equals("IN_REVIEW")) return claim(actor, id); // Existing client compatibility.
        User user = access.operator(actor, false); ModerationReport r = locked(id); requireOpen(r);
        if (!Set.of("RESOLVED", "REJECTED").contains(request.status()) || request.resolution().trim().isEmpty()) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (user.getRole() != UserRole.ADMIN && !actor.equals(r.getAssignedTo())) {
            throw new AppException(r.getAssignedTo() == null ? ErrorCode.REPORT_CLAIM_REQUIRED : ErrorCode.REPORT_ALREADY_ASSIGNED);
        }
        r.setStatus(request.status()); r.setResolution(request.resolution().trim()); r.setResolvedBy(actor); r.setResolvedAt(Instant.now());
        log(actor, "REPORT_RESOLVE", id + " " + request.status() + " assignedTo=" + r.getAssignedTo());
        boolean accepted = request.status().equals("RESOLVED");
        User reporter = users.findById(r.getReporterId()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        notifications.create(reporter, accepted ? NotificationType.REPORT_RESOLVED : NotificationType.REPORT_REJECTED,
                accepted ? "Báo cáo của bạn đã được xử lý" : "Báo cáo của bạn đã bị từ chối",
                "Bộ phận hỗ trợ đã phản hồi báo cáo. Bấm để xem toàn bộ lý do và kết quả xử lý.", id, "/reports/" + id);
        return response(r, user, true);
    }
    private void log(UUID actor, String action, String detail) {
        audit.save(AdminAudit.builder().actorId(actor).action(action).detail(detail).occurredAt(Instant.now()).build());
    }
    @Override @Transactional(readOnly = true)
    public PrivateReportFile openEvidence(UUID actor, UUID reportId, UUID evidenceId) {
        User user = access.active(actor); readable(user, reportId);
        ReportEvidence file = evidence.findByIdAndReport_Id(evidenceId, reportId).orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND));
        return new PrivateReportFile(storage.open(file), file.getContentType(), file.getOriginalName(), file.getSizeBytes());
    }
    private ReportResponse response(ModerationReport r, User user, boolean detailed) {
        boolean operator = user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.STAFF;
        boolean closed = !Set.of("OPEN", "IN_REVIEW").contains(r.getStatus());
        boolean owns = user.getId().equals(r.getAssignedTo());
        return new ReportResponse(r.getId(), r.getReporterId(), r.getTargetType(), r.getTargetId(), r.getReason(), r.getStatus(),
                r.getResolution(), r.getCreatedAt(), r.getResolvedAt(), r.getResolvedBy(), r.getAssignedTo(),
                r.getAssignedTo() == null ? null : users.findById(r.getAssignedTo()).map(User::getFullName).orElse("Nhân viên hỗ trợ"), r.getAssignedAt(),
                operator && !closed && r.getAssignedTo() == null,
                operator && !closed && r.getAssignedTo() != null && (owns || user.getRole() == UserRole.ADMIN),
                operator && !closed && (owns || user.getRole() == UserRole.ADMIN),
                detailed ? List.copyOf(r.getLinks()) : List.of(),
                detailed ? evidence.findByReport_IdOrderByCreatedAtAsc(r.getId()).stream().map(e -> new ReportResponse.Evidence(e.getId(), e.getOriginalName(), e.getContentType(), e.getSizeBytes(), "/reports/" + r.getId() + "/evidence/" + e.getId())).toList() : List.of());
    }
}
