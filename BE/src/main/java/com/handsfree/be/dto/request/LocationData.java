package com.handsfree.be.dto.request;
import jakarta.validation.constraints.*;
public record LocationData(@NotBlank @Size(max=255) String address,
        @NotBlank @Size(max=120) String area,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude) {
    public void validate() {
        if (address == null || address.isBlank() || address.length()>255 || area==null || area.isBlank() || area.length()>120
                || (latitude==null)!=(longitude==null)
                || latitude!=null && (!Double.isFinite(latitude)||!Double.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180))
            throw new com.handsfree.be.exception.AppException(com.handsfree.be.exception.ErrorCode.VALIDATION_FAILED);
    }
}
