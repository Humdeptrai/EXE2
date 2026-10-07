package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

/** Read-only metrics from the existing ledger; never changes payment or wallet state. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperatorAnalyticsService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcTemplate jdbc;

    public Map<String, Object> moderation() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("users", count("select count(*) from users"));
        result.put("jobs", count("select count(*) from job_posts"));
        result.put("matches", count("select count(*) from job_matches"));
        result.put("reports", count("select count(*) from moderation_reports"));
        result.put("pendingReports", count("select count(*) from moderation_reports where status in ('OPEN','PENDING','IN_REVIEW')"));
        result.put("hiddenJobs", count("select count(*) from job_posts where moderation_hidden=true"));
        result.put("reportStatuses", jdbc.query("select status, count(*) as total from moderation_reports group by status", (rs, row) -> Map.of("status", rs.getString("status"), "total", rs.getLong("total"))));
        result.put("jobStatuses", jdbc.query("select status, count(*) as total from job_posts group by status", (rs, row) -> Map.of("status", rs.getString("status"), "total", rs.getLong("total"))));
        return result;
    }

    public Map<String, Object> admin(String monthText) {
        YearMonth month;
        try { month = monthText == null ? YearMonth.now(ZONE) : YearMonth.parse(monthText); }
        catch (RuntimeException e) { throw new AppException(ErrorCode.VALIDATION_FAILED); }
        if (month.getYear() < 2000 || month.getYear() > 2100)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        var from = Timestamp.from(month.atDay(1).atStartOfDay(ZONE).toInstant());
        var to = Timestamp.from(month.plusMonths(1).atDay(1).atStartOfDay(ZONE).toInstant());
        Map<String, Object> result = moderation();
        result.put("month", month.toString());
        result.put("timezone", ZONE.getId());
        result.put("grossFees", amount("select coalesce(-sum(amount),0) from wallet_entries where kind='CONNECTION_FEE'"));
        result.put("refunds", amount("select coalesce(sum(amount),0) from wallet_entries where kind='REFUND'"));
        result.put("topups", amount("select coalesce(sum(amount),0) from wallet_entries where kind='TOPUP'"));
        result.put("netFees", ((BigDecimal) result.get("grossFees")).subtract((BigDecimal) result.get("refunds")));
        result.put("walletLiability", amount("select coalesce(sum(wallet_balance),0) from users"));
        result.put("feeTransactions", count("select count(*) from wallet_entries where kind='CONNECTION_FEE'"));
        List<Map<String, Object>> days = new ArrayList<>();
        for (int day = 1; day <= month.lengthOfMonth(); day++) {
            Map<String, Object> bucket = new LinkedHashMap<>();
            bucket.put("date", month.atDay(day).toString());
            bucket.put("fees", BigDecimal.ZERO); bucket.put("refunds", BigDecimal.ZERO); bucket.put("topups", BigDecimal.ZERO);
            days.add(bucket);
        }
        jdbc.query("select occurred_at, kind, amount from wallet_entries where occurred_at >= ? and occurred_at < ? and kind in ('CONNECTION_FEE','REFUND','TOPUP')", rs -> {
            int day = rs.getTimestamp("occurred_at").toInstant().atZone(ZONE).getDayOfMonth();
            var bucket = days.get(day - 1);
            String kind = rs.getString("kind");
            String key = kind.equals("CONNECTION_FEE") ? "fees" : kind.equals("REFUND") ? "refunds" : "topups";
            BigDecimal value = rs.getBigDecimal("amount");
            if (kind.equals("CONNECTION_FEE")) value = value.negate();
            bucket.put(key, ((BigDecimal) bucket.get(key)).add(value));
        }, from, to);
        BigDecimal fees = BigDecimal.ZERO, refunds = BigDecimal.ZERO, topups = BigDecimal.ZERO;
        for (var bucket : days) {
            fees = fees.add((BigDecimal) bucket.get("fees"));
            refunds = refunds.add((BigDecimal) bucket.get("refunds"));
            topups = topups.add((BigDecimal) bucket.get("topups"));
        }
        result.put("monthFees", fees); result.put("monthRefunds", refunds);
        result.put("monthNetFees", fees.subtract(refunds)); result.put("monthTopups", topups);
        result.put("daily", days);
        return result;
    }

    private long count(String sql) { return Objects.requireNonNull(jdbc.queryForObject(sql, Long.class)); }
    private BigDecimal amount(String sql) { return Objects.requireNonNull(jdbc.queryForObject(sql, BigDecimal.class)); }
}
