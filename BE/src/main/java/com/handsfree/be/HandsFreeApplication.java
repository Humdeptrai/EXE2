package com.handsfree.be;

import com.handsfree.be.properties.BusinessProperties;
import com.handsfree.be.properties.CorsProperties;
import com.handsfree.be.properties.CloudinaryProperties;
import com.handsfree.be.properties.GoogleProperties;
import com.handsfree.be.properties.JwtProperties;
import com.handsfree.be.properties.StorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, GoogleProperties.class, CorsProperties.class, StorageProperties.class, BusinessProperties.class, CloudinaryProperties.class})
public class HandsFreeApplication {
    public static void main(String[] args) {
        SpringApplication.run(HandsFreeApplication.class, args);
        System.out.println("Hello World !!!");
    }
}
