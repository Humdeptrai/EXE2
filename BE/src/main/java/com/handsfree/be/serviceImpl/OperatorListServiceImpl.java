package com.handsfree.be.serviceImpl;
import com.handsfree.be.service.OperatorListService;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.repository.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.*;
import org.hibernate.query.criteria.JpaExpression;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class OperatorListServiceImpl implements OperatorListService {
    private final AccountAccess access;
    private final JobPostRepository jobs;
    private final JobMatchRepository matches;
    private final UserRepository users;
    private final WalletTopUpRepository orders;
    private final WalletEntryRepository entries;
    private final AdminAuditRepository audit;
    private final ConnectionPaymentRepository payments;
    private Map<String,Object> row(Object... pairs) {
        Map<String,Object> result=new LinkedHashMap<>();
        for(int i=0;i<pairs.length;i+=2) result.put((String)pairs[i],pairs[i+1]);
        return result;
    }
    private String name(UUID id) { return id==null ? "" : users.findNameById(id).map(UserRepository.Name::getFullName).orElse(""); }
    @Override public PageResponse<Map<String,Object>> list(UUID actor,String panel,int page,String search,String state) {
        access.operator(actor,!"jobs".equals(panel));
        if(search==null || search.length()>100 || state==null || state.length()>40) throw new AppException(ErrorCode.VALIDATION_FAILED);
        String q=search.trim().toLowerCase(Locale.ROOT);
        var created=PageRequest.of(Math.max(0,page),20,Sort.by(Sort.Direction.DESC,"createdAt").and(Sort.by(Sort.Direction.DESC,"id")));
        var occurred=PageRequest.of(Math.max(0,page),20,Sort.by(Sort.Direction.DESC,"occurredAt").and(Sort.by(Sort.Direction.DESC,"id")));
        return switch(panel) {
            case "jobs" -> PageResponse.from(jobs.findAll(filter(q,state,"status","title","id","owner.fullName","owner.id"),created).map(j -> row(
                "id",j.getId(),"title",j.getTitle(),"status",j.getStatus(),"hidden",j.isModerationHidden(),"ownerId",j.getOwner().getId(),"ownerName",j.getOwner().getFullName(),
                "scheduledDate",j.getScheduledDate(),"startTime",j.getStartTime(),"expectedEndAt",j.getExpectedEndAt(),"createdAt",j.getCreatedAt())));
            case "matches" -> PageResponse.from(matches.findAll(filter(q,state,"status","id","jobPost.title","consumer.fullName","provider.fullName","consumer.id","provider.id"),created).map(m -> {
                var p=payments.findByJobMatch_Id(m.getId()).orElse(null);
                return row("id",m.getId(),"title",m.getJobPost().getTitle(),"consumerId",m.getConsumer().getId(),"consumerName",m.getConsumer().getFullName(),"providerId",m.getProvider().getId(),"providerName",m.getProvider().getFullName(),
                    "status",m.getStatus(),"consumerPaymentStatus",p==null?null:p.getConsumerPaymentStatus(),"providerPaymentStatus",p==null?null:p.getProviderPaymentStatus(),"paymentStatus",p==null?null:p.getStatus(),
                    "paymentDeadlineAt",m.getPaymentDeadlineAt(),"expectedEndAt",m.getExpectedEndAt());
            }));
            case "users" -> PageResponse.from(users.findAll(filter(q,state,"role","fullName","email","phone","id"),created).map(u -> row("id",u.getId(),"fullName",u.getFullName(),"email",u.getEmail(),"role",u.getRole(),"active",u.isActive(),"balance",u.getWalletBalance())));
            case "topups" -> PageResponse.from(orders.findAll(filter(q,state,"status","orderCode","ownerId","@ownerName"),PageRequest.of(Math.max(0,page),20,Sort.by(Sort.Direction.DESC,"createdAt").and(Sort.by(Sort.Direction.DESC,"orderCode")))).map(o -> row("orderCode",o.getOrderCode(),"ownerId",o.getOwnerId(),"ownerName",name(o.getOwnerId()),"requestId",o.getRequestId(),"checkoutUrl",o.getCheckoutUrl(),"paymentLinkId",o.getPaymentLinkId(),"amount",o.getAmount(),"status",o.getStatus(),"createdAt",o.getCreatedAt(),"creditedAt",o.getCreditedAt())));
            case "ledger" -> PageResponse.from(entries.findAll(filter(q,state,"kind","id","ownerId","description","@ownerName"),occurred).map(e -> row("id",e.getId(),"ownerId",e.getOwnerId(),"ownerName",name(e.getOwnerId()),"kind",e.getKind(),"amount",e.getAmount(),"balanceAfter",e.getBalanceAfter(),"description",e.getDescription(),"dedupeKey",e.getDedupeKey(),"occurredAt",e.getOccurredAt())));
            case "audit" -> PageResponse.from(audit.findAll(filter(q,state,"action","id","actorId","detail","@actorName"),occurred).map(a -> row("id",a.getId(),"actorId",a.getActorId(),"actorName",name(a.getActorId()),"action",a.getAction(),"detail",a.getDetail(),"occurredAt",a.getOccurredAt())));
            default -> throw new AppException(ErrorCode.VALIDATION_FAILED);
        };
    }
    private <T> Specification<T> filter(String search,String state,String stateField,String... fields) {
        return (root,query,cb) -> {
            List<Predicate> and=new ArrayList<>();
            if(!state.isBlank()) {
                if(root.getJavaType()==JobMatch.class && Set.of("WAITING_PAYMENT","CONNECTED").contains(state)) {
                    var sq=query.subquery(UUID.class); var payment=sq.from(ConnectionPayment.class);
                    sq.select(payment.get("jobMatch").get("id")).where(cb.equal(payment.get("status"),com.handsfree.be.constant.PaymentStatus.PAID));
                    and.add(cb.equal(root.get("status"),com.handsfree.be.constant.MatchStatus.ACTIVE));
                    and.add(state.equals("CONNECTED") ? root.get("id").in(sq) : cb.not(root.get("id").in(sq)));
                } else if(root.getJavaType()==User.class && Set.of("ACTIVE_USER","LOCKED_USER").contains(state)) {
                    and.add(cb.equal(root.get("active"),state.equals("ACTIVE_USER")));
                } else if(root.getJavaType()==JobPost.class && Set.of("HIDDEN","VISIBLE").contains(state)) {
                    and.add(cb.equal(root.get("moderationHidden"),state.equals("HIDDEN")));
                } else {
                    var path=root.get(stateField); Object value=state;
                    if(path.getJavaType().isEnum()) { try { value=enumValue(path.getJavaType(),state); } catch(IllegalArgumentException e) { throw new AppException(ErrorCode.VALIDATION_FAILED); } }
                    and.add(cb.equal(path,value));
                }
            }
            if(!search.isBlank()) {
                String pattern="%"+search.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
                List<Predicate> or=new ArrayList<>();
                for(String field:fields) {
                    if(field.startsWith("@")) {
                        var sq=query.subquery(UUID.class);var u=sq.from(User.class);sq.select(u.get("id"));
                        sq.where(cb.like(cb.lower(u.get("fullName")),pattern,'\\'));
                        or.add(root.get(field.equals("@actorName")?"actorId":"ownerId").in(sq));
                    } else {
                        Path<?> path=root;
                        for(String part:field.split("\\.")) path=path.get(part);
                        Expression<String> text=((JpaExpression<?>)path).cast(String.class);
                        or.add(cb.like(cb.lower(text),pattern,'\\'));
                    }
                }
                and.add(cb.or(or.toArray(Predicate[]::new)));
            }
            return cb.and(and.toArray(Predicate[]::new));
        };
    }
    @SuppressWarnings({"rawtypes","unchecked"}) private Object enumValue(Class<?> type,String value) { return Enum.valueOf((Class)type,value); }
}
