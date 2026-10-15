package com.handsfree.be.service;
import com.handsfree.be.dto.request.LocationData;
import java.util.*;
public interface GeocodingService {
    List<LocationData> search(UUID user,String text,Double latitude,Double longitude);
    List<LocationData> reverse(UUID user,double latitude,double longitude);
}
