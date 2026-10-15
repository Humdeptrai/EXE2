package com.handsfree.be.service;
import com.handsfree.be.dto.request.LocationData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
public interface LocationService {
    record AddressRequest(@NotBlank @Size(max=40) String label, @NotNull @Valid LocationData place, boolean defaultAddress) {}
    record Address(UUID id,String label,LocationData place,boolean defaultAddress) {}
    record Activity(@NotNull @Valid LocationData place,Integer radiusKm) {}
    List<Address> addresses(UUID user);
    Address save(UUID user,UUID address,AddressRequest request);
    void delete(UUID user,UUID address);
    Activity activity(UUID user);
    Activity saveActivity(UUID user,Activity request);
    List<LocationData> search(UUID user,String text,Double latitude,Double longitude);
    List<LocationData> reverse(UUID user,double latitude,double longitude);
}
