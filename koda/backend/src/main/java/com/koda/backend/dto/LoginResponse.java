package com.koda.backend.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, String displayName) {
}
