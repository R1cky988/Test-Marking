package com.example.testmarking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TestmarkingApplication {

	public static void main(String[] args) {
		SpringApplication.run(TestmarkingApplication.class, args);
	}

}
