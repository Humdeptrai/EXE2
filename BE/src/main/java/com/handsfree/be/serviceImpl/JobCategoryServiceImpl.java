package com.handsfree.be.serviceImpl;

import com.handsfree.be.dto.response.JobCategoryResponse;
import com.handsfree.be.repository.JobCategoryRepository;
import com.handsfree.be.service.JobCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JobCategoryServiceImpl implements JobCategoryService {
    private final JobCategoryRepository jobCategoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<JobCategoryResponse> getActiveCategories() {
        return jobCategoryRepository.findAllByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(category -> new JobCategoryResponse(
                        category.getId(),
                        category.getCode(),
                        category.getName(),
                        category.getDescription(),
                        category.getIcon()
                ))
                .toList();
    }
}
