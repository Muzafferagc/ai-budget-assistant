package com.aibudget.assistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseItemAnalysisResult {

    // Fişten çıkarılan ürün adı
    private String name;

    // Fişten çıkarılan ürünün birim veya toplam fiyatı
    private BigDecimal price;

    // Fişten çıkarılan ürün adedi
    private Integer quantity;
}
