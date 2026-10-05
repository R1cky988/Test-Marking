package com.example.testmarking.common.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    private String endpoint;
    private String accessKey;
    private String secretKey;
    private Buckets buckets = new Buckets();

    @Data
    public static class Buckets {
        private String raw;
        private String marked;
        private String avatar;
    }
}