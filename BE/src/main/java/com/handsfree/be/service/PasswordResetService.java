package com.handsfree.be.service;
public interface PasswordResetService {
 void request(String email);
 void reset(String token,String password);
}
