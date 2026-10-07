package com.handsfree.be.serviceImpl;

import com.handsfree.be.entity.PlatformSettings;
import com.handsfree.be.repository.PlatformSettingsRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlatformSettingsService {
    private final PlatformSettingsRepository settings;
    private final JdbcTemplate jdbc;

    @Transactional
    public PlatformSettings get() {
        jdbc.update(
                "insert into"
                    + " platform_settings(id,consumer_fee,provider_fee,min_top_up,max_top_up,top_up_enabled,version)"
                    + " values(1,10000,5000,10000,5000000,true,0) on conflict do nothing");
        return settings.findById(1).orElseThrow();
    }
}
