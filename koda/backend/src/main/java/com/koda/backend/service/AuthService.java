package com.koda.backend.service;

import com.koda.backend.dto.LoginRequest;
import com.koda.backend.dto.LoginResponse;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public LoginResponse authenticate(LoginRequest request) {
        // Replace with user lookup and signed JWT generation when persistence is connected.
        return new LoginResponse("pending-jwt-token", "Bearer", 86400, request.email());
    }
}
