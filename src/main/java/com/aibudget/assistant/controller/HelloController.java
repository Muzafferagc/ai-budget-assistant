package com.aibudget.assistant.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/health")
    public String healthCheck() {
        return "AI Budget Assistant Backend is running!";
    }
}
