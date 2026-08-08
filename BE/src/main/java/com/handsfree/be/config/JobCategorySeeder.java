package com.handsfree.be.config;

import com.handsfree.be.entity.JobCategory;
import com.handsfree.be.repository.JobCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class JobCategorySeeder implements ApplicationRunner {
    private final JobCategoryRepository jobCategoryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<CategorySeed> seeds = List.of(
                new CategorySeed("HOUSEHOLD", "Nhà cửa", "Dọn phòng, giặt đồ và các việc sinh hoạt", "home", 1),
                new CategorySeed("PET_CARE", "Thú cưng", "Chăm sóc, dắt đi dạo và hỗ trợ thú cưng", "pet", 2),
                new CategorySeed("DELIVERY", "Giao hàng", "Mua hộ, nhận hàng và chuyển đồ", "delivery", 3),
                new CategorySeed("REPAIR", "Sửa chữa", "Hỗ trợ sửa chữa nhỏ và lắp đặt cơ bản", "repair", 4),
                new CategorySeed("STUDY", "Học tập", "In tài liệu và hỗ trợ công việc học tập", "study", 5)
        );

        for (CategorySeed seed : seeds) {
            if (!jobCategoryRepository.existsByCode(seed.code())) {
                jobCategoryRepository.save(JobCategory.builder()
                        .code(seed.code())
                        .name(seed.name())
                        .description(seed.description())
                        .icon(seed.icon())
                        .displayOrder(seed.displayOrder())
                        .active(true)
                        .build());
            }
        }
    }

    private record CategorySeed(String code, String name, String description, String icon, int displayOrder) {
    }
}
