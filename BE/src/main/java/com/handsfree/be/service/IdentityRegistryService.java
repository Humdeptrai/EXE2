package com.handsfree.be.service;
import java.util.*;
public interface IdentityRegistryService {
 record Conflict(UUID userId,String kind,Double similarity) {}
 record Assessment(boolean allowed,String message,List<Conflict> conflicts,UUID documentOwner,Long claimVersion) {
  public Assessment(boolean allowed,String message,List<Conflict> conflicts){this(allowed,message,conflicts,null,null);}
 }
 record Backfill(int processed,long remaining,java.util.List<UUID> needsReview) {}
 record Evidence(String accountName,String status,String fullName,String documentNumber) {}
 Evidence evidence(UUID actor,UUID user);
 byte[] image(UUID actor,UUID user,String kind);
 Assessment inspect(UUID actor,UUID user);
 void lock();
 Assessment assess(UUID user,String number,String evidence);
 void claim(UUID user,String number,String evidence,boolean manual,boolean transfer,UUID expectedOwner,Long expectedVersion);
 void claim(UUID user,String number,String evidence,boolean manual,boolean transfer);
 Backfill backfill(UUID actor);
}
