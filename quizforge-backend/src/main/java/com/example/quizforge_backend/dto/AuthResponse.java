package com.example.quizforge_backend.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private boolean success;
    private String message;
    private Object user;
}
