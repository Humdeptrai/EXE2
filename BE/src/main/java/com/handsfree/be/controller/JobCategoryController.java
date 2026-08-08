package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.response.JobCategoryResponse;
import com.handsfree.be.service.JobCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/job-categories")
@RequiredArgsConstructor
@Tag(name = "3. Job Category", description = "Active job categories used by the posting form")
@SecurityRequirement(name = "bearerAuth")
public class JobCategoryController {
    private final JobCategoryService jobCategoryService;

    @GetMapping
    @Operation(summary = "Get active job categories")
    public ResponseEntity<ApiResponse<List<JobCategoryResponse>>> getActiveCategories() {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh mục công việc thành công",
                jobCategoryService.getActiveCategories()
        ));
    }
}
