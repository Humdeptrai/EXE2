package com.handsfree.be.serviceImpl;
public final class LocationPrivacy {
    private LocationPrivacy() {}
    public static String area(com.handsfree.be.entity.JobPost job) {
        return job.getAreaLabel()==null || job.getAreaLabel().isBlank() ? "Chưa cập nhật khu vực" : job.getAreaLabel();
    }
}
