package com.handsfree.be.controller;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/locations") @RequiredArgsConstructor
public class LocationController {
    private final LocationService service;
    private UUID id(Authentication a){return UUID.fromString(a.getName());}
    @GetMapping("/addresses") public ApiResponse<?> list(Authentication a){return ApiResponse.success(200,"Địa chỉ của bạn",service.addresses(id(a)));}
    @PostMapping("/addresses") public ApiResponse<?> save(Authentication a,@Valid @RequestBody LocationService.AddressRequest r){return ApiResponse.success(200,"Đã lưu địa chỉ",service.save(id(a),null,r));}
    @PutMapping("/addresses/{address}") public ApiResponse<?> update(Authentication a,@PathVariable UUID address,@Valid @RequestBody LocationService.AddressRequest r){return ApiResponse.success(200,"Đã cập nhật địa chỉ",service.save(id(a),address,r));}
    @DeleteMapping("/addresses/{address}") public ApiResponse<?> delete(Authentication a,@PathVariable UUID address){service.delete(id(a),address);return ApiResponse.success(200,"Đã xoá địa chỉ",null);}
    @GetMapping("/activity") public ApiResponse<?> activity(Authentication a){return ApiResponse.success(200,"Khu vực hoạt động",service.activity(id(a)));}
    @PutMapping("/activity") public ApiResponse<?> activity(Authentication a,@Valid @RequestBody LocationService.Activity r){return ApiResponse.success(200,"Đã lưu khu vực hoạt động",service.saveActivity(id(a),r));}
    @GetMapping("/search") public ApiResponse<?> search(Authentication a,@RequestParam String text,@RequestParam(required=false) Double latitude,@RequestParam(required=false) Double longitude){return ApiResponse.success(200,"Gợi ý địa chỉ",service.search(id(a),text,latitude,longitude));}
    @GetMapping("/reverse") public ApiResponse<?> reverse(Authentication a,@RequestParam double latitude,@RequestParam double longitude){return ApiResponse.success(200,"Địa chỉ tại vị trí",service.reverse(id(a),latitude,longitude));}
}
