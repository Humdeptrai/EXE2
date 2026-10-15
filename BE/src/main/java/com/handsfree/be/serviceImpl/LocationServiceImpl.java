package com.handsfree.be.serviceImpl;
import com.handsfree.be.service.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.dto.request.LocationData;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor
public class LocationServiceImpl implements LocationService {
    private final AccountAccess access;
    private final UserRepository users;
    private final SavedAddressRepository addresses;
    private final ActivityLocationRepository activities;
    private final GeocodingService geocoding;
    private void lock(UUID user) { access.active(user); users.lockById(user).orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND)); }
    private Address view(SavedAddress a) {return new Address(a.getId(),a.getLabel(),new LocationData(a.getAddress(),a.getArea(),a.getLatitude(),a.getLongitude()),a.isDefaultAddress());}
    @Transactional(readOnly=true) public List<Address> addresses(UUID user) {
        access.active(user); return addresses.findByOwnerIdOrderByDefaultAddressDescLabelAsc(user).stream().map(this::view).toList();
    }
    @Transactional public Address save(UUID user,UUID id,AddressRequest request) {
        lock(user); request.place().validate();
        if(id==null && addresses.countByOwnerId(user)>=10) throw new AppException(ErrorCode.ADDRESS_LIMIT);
        var a=id==null?new SavedAddress():addresses.findByIdAndOwnerId(id,user).orElseThrow(()->new AppException(ErrorCode.FORBIDDEN));
        a.setOwnerId(user); a.setLabel(request.label().trim()); a.setAddress(request.place().address().trim()); a.setArea(request.place().area().trim());
        a.setLatitude(request.place().latitude()); a.setLongitude(request.place().longitude());
        boolean makeDefault=request.defaultAddress() || addresses.countByOwnerId(user)==0 || a.isDefaultAddress();
        if(makeDefault) { for(var existing:addresses.findByOwnerIdOrderByDefaultAddressDescLabelAsc(user)) existing.setDefaultAddress(false); addresses.flush(); }
        a.setDefaultAddress(makeDefault); return view(addresses.save(a));
    }
    @Transactional public void delete(UUID user,UUID id) {
        lock(user); var a=addresses.findByIdAndOwnerId(id,user).orElseThrow(()->new AppException(ErrorCode.FORBIDDEN));
        boolean wasDefault=a.isDefaultAddress(); addresses.delete(a); addresses.flush();
        if(wasDefault) addresses.findByOwnerIdOrderByDefaultAddressDescLabelAsc(user).stream().findFirst().ifPresent(next->next.setDefaultAddress(true));
    }
    @Transactional(readOnly=true) public Activity activity(UUID user) { access.active(user); return activities.findById(user).map(a->new Activity(new LocationData(a.getArea(),a.getArea(),a.getLatitude(),a.getLongitude()),a.getRadiusKm())).orElse(null); }
    @Transactional public Activity saveActivity(UUID user,Activity request) {
        lock(user); request.place().validate();
        ContactPrivacy.validate(request.place().area());
        if(request.radiusKm()!=null && (!List.of(1,3,5,10,20).contains(request.radiusKm()) || request.place().latitude()==null)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        var a=activities.findById(user).orElseGet(ActivityLocation::new); a.setUserId(user); a.setArea(request.place().area().trim());
        a.setLatitude(request.place().latitude()); a.setLongitude(request.place().longitude()); a.setRadiusKm(request.radiusKm()); activities.save(a);
        users.findById(user).orElseThrow().setLocation(a.getArea()); return activity(user);
    }
    public List<LocationData> search(UUID user,String text,Double lat,Double lon) {access.active(user);return geocoding.search(user,text,lat,lon);}
    public List<LocationData> reverse(UUID user,double lat,double lon) {access.active(user);return geocoding.reverse(user,lat,lon);}
}
