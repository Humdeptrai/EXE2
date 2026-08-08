package com.handsfree.be.service;

import com.handsfree.be.dto.response.JobCategoryResponse;

import java.util.List;

public interface JobCategoryService {
    List<JobCategoryResponse> getActiveCategories();
}
