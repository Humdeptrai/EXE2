package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.*;
import com.handsfree.be.entity.ProfileSkill;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.ProfileSkillRepository;
import com.handsfree.be.service.*;
import com.handsfree.be.dto.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.time.Instant;
import java.text.Normalizer;
import java.util.*;

@Service @RequiredArgsConstructor
public class ProfileSkillServiceImpl implements ProfileSkillService {
    private final ProfileSkillRepository skills;
    private final AccountAccess accounts;
    private final NotificationService notifications;
    private String clean(String input) {
        String value=Normalizer.normalize(Objects.requireNonNullElse(input, ""), Normalizer.Form.NFC).strip().replaceAll("\\s+", " ");
        if(value.length()<2 || value.length()>40 || value.chars().anyMatch(Character::isISOControl)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        ContactPrivacy.validate(value);
        return value;
    }
    private String key(String input) { return Normalizer.normalize(Objects.requireNonNullElse(input, ""), Normalizer.Form.NFC).strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
    private Skill dto(ProfileSkill s) { return new Skill(s.getId(),s.getName(),s.getStatus(), s.getSubmittedBy()==null?null:s.getSubmittedBy().getId(),s.getSubmittedBy()==null?null:s.getSubmittedBy().getFullName(),s.getCreatedAt(),s.getRejectionReason()); }
    @Override @Transactional(readOnly=true)
    public List<Skill> catalog(UUID user) {
        accounts.active(user);
        // The public catalog contains no submitter information.
        return skills.findByStatusOrderByNameAsc("APPROVED").stream().map(s -> new Skill(s.getId(),s.getName(),s.getStatus(),null,null,null,null)).toList();
    }
    @Override @Transactional(readOnly=true)
    public List<Skill> mine(UUID user) { accounts.active(user); return skills.findTop50BySubmittedBy_IdOrderByCreatedAtDesc(user).stream().map(this::dto).toList(); }
    @Override @Transactional
    public Skill propose(UUID user,String name) {
        var account=accounts.active(user);
        if(account.getRole()!=UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN);
        String value=clean(name), key=key(value);
        if(skills.findByNormalizedName(key).isPresent()) throw new AppException(ErrorCode.SKILL_ALREADY_EXISTS);
        return dto(skills.saveAndFlush(ProfileSkill.builder().name(value).normalizedName(key).status("PENDING").submittedBy(account).build()));
    }
    @Override @Transactional
    public Skill add(UUID admin,String name) {
        var actor=accounts.operator(admin,true);
        String value=clean(name), key=key(value);
        if(skills.findByNormalizedName(key).isPresent()) throw new AppException(ErrorCode.SKILL_ALREADY_EXISTS);
        return dto(skills.saveAndFlush(ProfileSkill.builder().name(value).normalizedName(key).status("APPROVED").reviewedBy(actor).reviewedAt(Instant.now()).build()));
    }
    @Override @Transactional
    public Skill review(UUID admin,UUID id,boolean approved,String reason) {
        var actor=accounts.operator(admin,true);
        var skill=skills.lock(id).orElseThrow(() -> new AppException(ErrorCode.SKILL_NOT_FOUND));
        if(!skill.getStatus().equals("PENDING")) throw new AppException(ErrorCode.DATA_CONFLICT);
        String note=Objects.requireNonNullElse(reason, "").strip();
        if(!approved && (note.isBlank()||note.length()>300)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        skill.setStatus(approved?"APPROVED":"REJECTED"); skill.setRejectionReason(approved?null:note);
        skill.setReviewedBy(actor); skill.setReviewedAt(Instant.now());
        if(skill.getSubmittedBy()!=null) notifications.create(skill.getSubmittedBy(),NotificationType.SKILL_REVIEWED,
            approved?"Đề xuất đã được duyệt":"Đề xuất chưa được chấp nhận",
            approved?"Kỹ năng / sở thích “"+skill.getName()+"” đã được thêm vào danh mục. Bạn có thể chọn trong hồ sơ.":"“"+skill.getName()+"”: "+note,
            skill.getId(),"/profile?skills=1");
        return dto(skill);
    }
    @Override @Transactional(readOnly=true)
    public PageResponse<Skill> search(UUID admin,String search,String status,int page) {
        accounts.operator(admin,true);
        if(!Set.of("","PENDING","APPROVED","REJECTED").contains(status)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        String q=Objects.requireNonNullElse(search, "").strip().toLowerCase(Locale.ROOT);
        if(q.length()>100) throw new AppException(ErrorCode.VALIDATION_FAILED);
        q=q.replace("!","!!").replace("%","!%").replace("_","!_");
        return PageResponse.from(skills.search(status,"%"+q+"%",PageRequest.of(Math.max(0,page),20)).map(this::dto));
    }
    @Override @Transactional(readOnly=true)
    public Set<String> approvedTags(List<String> tags,Set<String> previous) {
        LinkedHashSet<String> result=new LinkedHashSet<>();
        if(tags==null) return result;
        if(tags.size()>8) throw new AppException(ErrorCode.VALIDATION_FAILED);
        Map<String,String> allowed=new HashMap<>();
        skills.findByStatusOrderByNameAsc("APPROVED").forEach(s -> allowed.put(s.getNormalizedName(),s.getName()));
        // Retain a user's pre-migration values without making them a public catalog entry.
        if(previous!=null) previous.forEach(s -> allowed.putIfAbsent(key(s),s));
        for(String tag:tags) { String value=allowed.get(key(tag)); if(value==null) throw new AppException(ErrorCode.SKILL_NOT_APPROVED); result.add(value); }
        return result;
    }
}
