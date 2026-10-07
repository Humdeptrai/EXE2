package com.handsfree.be.entity;

import jakarta.persistence.*;

import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
public class PlatformSettings {
    @Id private Integer id;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal consumerFee;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal providerFee;

    @Column(nullable = false)
    private long minTopUp;

    @Column(nullable = false)
    private long maxTopUp;

    @Column(nullable = false)
    private boolean topUpEnabled;

    @Column(nullable = false)
    private int paymentWindowMinutes = 1440;

    @Version private long version;
}
