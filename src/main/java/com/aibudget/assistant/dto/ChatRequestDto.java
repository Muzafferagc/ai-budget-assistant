package com.aibudget.assistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequestDto {
    // Kullanıcının bütçe asistanına sorduğu soru
    private String message;
}
