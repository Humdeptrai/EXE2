package com.handsfree.be.repository;
import com.handsfree.be.entity.SavedAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SavedAddressRepository extends JpaRepository<SavedAddress,UUID> {
    List<SavedAddress> findByOwnerIdOrderByDefaultAddressDescLabelAsc(UUID ownerId);
    Optional<SavedAddress> findByIdAndOwnerId(UUID id,UUID ownerId);
    long countByOwnerId(UUID ownerId);
}
