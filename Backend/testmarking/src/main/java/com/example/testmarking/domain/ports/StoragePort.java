package com.example.testmarking.domain.ports;

import java.io.InputStream;

public interface StoragePort {
    void uploadFile(String bucketName, String objectName, InputStream inputStream, String contentType, long size);
    InputStream getFile(String bucketName, String objectName);
}