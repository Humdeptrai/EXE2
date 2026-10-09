package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.*;
import com.handsfree.be.dto.response.MatchUserResponse;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactAccess {
    private final ConnectionPaymentRepository payments;
    private final WalletEntryRepository entries;
    private final IdentityRepository identities;
    private final IdentityCrypto crypto;

    public boolean unlocked(JobMatch match) {
        if (match.getStatus() == MatchStatus.EXPIRED) return false;
        var payment = payments.findByJobMatch_Id(match.getId());
        if (payment.isEmpty()) return false;
        var p = payment.get();
        return p.getConsumerPaymentStatus() == PaymentStatus.PAID
                && p.getProviderPaymentStatus() == PaymentStatus.PAID
                && p.getConsumerPaymentMethod() == PaymentMethod.WALLET
                && p.getProviderPaymentMethod() == PaymentMethod.WALLET
                && entries.existsByDedupeKey(
                        "CONNECT:" + match.getId() + ":" + match.getConsumer().getId())
                && entries.existsByDedupeKey(
                        "CONNECT:" + match.getId() + ":" + match.getProvider().getId());
    }

    public MatchUserResponse user(User u, JobMatch match) {
        boolean open = unlocked(match);
        var verified = open ? identities.findPublicByUserId(u.getId()).filter(i -> "VERIFIED".equals(i.getStatus())).orElse(null) : null;
        return new MatchUserResponse(
                u.getId(),
                verified != null ? crypto.text(verified.getFullName()) : open ? u.getFullName() : "Người dùng HandsFree",
                open ? u.getAvatarUrl() : null,
                ContactPrivacy.redact(u.getLocation()),
                ContactPrivacy.redact(u.getBio()),
                u.getProfileTags() == null
                        ? List.of()
                        : u.getProfileTags().stream().map(ContactPrivacy::redact).toList(),
                u.isProfileCompleted(),
                open ? u.getPhone() : null,
                open ? u.getEmail() : null,
                verified != null && verified.getSelfieVerifiedAt() != null ? "/matches/" + match.getId() + "/counterpart-face" : null,
                verified != null);
    }
}
