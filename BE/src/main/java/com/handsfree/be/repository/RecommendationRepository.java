package com.handsfree.be.repository;

import com.handsfree.be.dto.response.RecommendationResponse;
import com.handsfree.be.entity.JobInterest;
import com.handsfree.be.entity.JobPost;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.*;

/** Database ordering happens before offset/limit. Counts deliberately include repeat pairs. */
@Repository
@RequiredArgsConstructor
public class RecommendationRepository {
    private final EntityManager em;
    private static final String FEED = """
            from JobPost job
            where job.owner.active = true and job.status = :status
              and job.moderationHidden = false
              and job.owner.id <> :userId
              and job.scheduledDate >= :today
              and (:categoryId is null or job.category.id = :categoryId)
              and (:keyword = ''
                   or lower(job.title) like concat('%', :keyword, '%')
                   or lower(job.description) like concat('%', :keyword, '%')
                   or lower(job.location) like concat('%', :keyword, '%'))
              and (:location = '' or lower(coalesce(job.areaLabel,job.location)) like concat('%', :location, '%'))
              and (:radiusKm is null or (job.latitude is not null and (6371.0088 * acos(least(1.0, greatest(-1.0, sin(radians(coalesce(:latitude,0.0))) * sin(radians(job.latitude)) + cos(radians(coalesce(:latitude,0.0))) * cos(radians(job.latitude)) * cos(radians(job.longitude - coalesce(:longitude,0.0))))))) <= :radiusKm))
              and (:minBudget is null or job.budgetAmount >= :minBudget)
              and (:maxBudget is null or job.budgetAmount <= :maxBudget)
              and (select count(jm.id)
                   from JobMatch jm
                   where jm.jobPost.id = job.id
                     and jm.status = :activeMatchStatus) < job.requiredWorkers
              and not exists (
                    select skipped.id
                    from SkippedJob skipped
                    where skipped.user.id = :userId
                      and skipped.jobPost.id = job.id
              )
              and not exists (
                    select interest.id
                    from JobInterest interest
                    where interest.applicant.id = :userId
                      and interest.jobPost.id = job.id
                      and interest.status in :hiddenInterestStatuses
              )
            """;
    private static final String CANDIDATES = """
            from JobInterest interest
            where interest.jobPost.id = :jobId and interest.jobPost.owner.id = :ownerId
              and interest.status = com.handsfree.be.constant.InterestStatus.PENDING
              and interest.applicant.active = true
            """;

    private record Signals(String n, String sum, String e, String k) {
        String rating() { return "(20.0 * (" + sum + " + 17.5) / (" + n + " + 5.0))"; }
        String category() { return "(50.0 + 50.0 * " + k + " / (" + k + " + 3.0))"; }
        String experience() { return "(50.0 + 50.0 * " + e + " / (" + e + " + 10.0))"; }
        String score() { return "(" + rating() + " * 0.45 + " + category() + " * 0.35 + " + experience() + " * 0.20)"; }
        String columns() { return rating()+", "+category()+", "+experience()+", "+sum+", "+n+", "+e+", "+k; }
    }

    private Signals signals(String ratedId, String mode, String providerId, String categoryId) {
        String ratingFilter = " from MatchRating r where r.ratedUser.id = " + ratedId
                + " and r.ratedAsMode = com.handsfree.be.constant.UserMode." + mode;
        String n = "(select count(r.id)" + ratingFilter + ")";
        String sum = "(select coalesce(sum(r.stars),0)" + ratingFilter + ")";
        String e = "(select count(m.id) from JobMatch m where m.connectionSucceededAt is not null and m."
                + (mode.equals("PROVIDER") ? "provider" : "consumer") + ".id = " + ratedId + ")";
        String k = "(select count(h.id) from JobMatch h where h.connectionSucceededAt is not null and h.provider.id = "
                + providerId + " and h.jobPost.category.id = " + categoryId + ")";
        return new Signals(n,sum,e,k);
    }
    private Signals candidates() { return signals("interest.applicant.id", "PROVIDER", "interest.applicant.id", "interest.jobPost.category.id"); }
    private Signals jobs() { return signals("job.owner.id", "CONSUMER", ":viewerId", "job.category.id"); }

    public Page<JobInterest> candidates(UUID ownerId, UUID jobId, Pageable page) {
        var params = Map.<String,Object>of("ownerId",ownerId,"jobId",jobId);
        var signal = candidates();
        String order = " order by round("+signal.score()+",0) desc, "+signal.k()+" desc, interest.createdAt asc, interest.id asc";
        return page("select interest "+CANDIDATES, CANDIDATES, order, params, JobInterest.class, page);
    }
    public Page<JobPost> feed(UUID viewerId, Map<String,Object> filters, Pageable page) {
        var params = new HashMap<>(filters); params.put("viewerId",viewerId);
        var signal = jobs();
        String order = " order by round("+signal.score()+",0) desc, "+signal.k()+" desc, job.publishedAt desc, job.createdAt desc, job.id asc";
        return page("select job "+FEED, FEED, order, params, JobPost.class, page);
    }
    private <T> Page<T> page(String select, String from, String order, Map<String,Object> params, Class<T> type, Pageable page) {
        var query = em.createQuery(select+order,type);
        params.forEach(query::setParameter);
        query.setFirstResult(Math.toIntExact(page.getOffset())).setMaxResults(page.getPageSize());
        var count = em.createQuery("select count(*) "+from,Long.class);
        // viewerId only occurs in the scoring expression, not in the count predicate.
        params.forEach((key,value) -> { if (!key.equals("viewerId")) count.setParameter(key,value); });
        return new PageImpl<>(query.getResultList(),page,count.getSingleResult());
    }
    public Map<UUID,RecommendationResponse> candidateScores(Collection<UUID> ids) {
        return scores("interest", "JobInterest", candidates(), null, ids);
    }
    public Map<UUID,RecommendationResponse> jobScores(UUID viewerId, Collection<UUID> ids) {
        return scores("job", "JobPost", jobs(), viewerId, ids);
    }
    private Map<UUID,RecommendationResponse> scores(String alias,String entity,Signals signal,UUID viewerId,Collection<UUID> ids) {
        if(ids.isEmpty()) return Map.of();
        var query=em.createQuery("select "+alias+".id, "+signal.columns()+" from "+entity+" "+alias+" where "+alias+".id in :ids",Object[].class);
        query.setParameter("ids",ids);
        if(viewerId!=null) query.setParameter("viewerId",viewerId);
        Map<UUID,RecommendationResponse> result=new HashMap<>();
        for(Object[] row:query.getResultList()) {
            double r=((Number)row[1]).doubleValue(),c=((Number)row[2]).doubleValue(),e=((Number)row[3]).doubleValue();
            long n=((Number)row[5]).longValue(),connections=((Number)row[6]).longValue(),same=((Number)row[7]).longValue();
            result.put((UUID)row[0],new RecommendationResponse((int)Math.round(r*.45+c*.35+e*.20),r,c,e,
                    n==0?null:((Number)row[4]).doubleValue()/n,n,connections,same,n<5));
        }
        return result;
    }
}
