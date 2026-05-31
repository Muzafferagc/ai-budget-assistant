package com.aibudget.assistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseAnalysisResult {
    
    // Fişten çıkarılan harcama tutarı
    private BigDecimal amount;

    // Fişten çıkarılan mekan adı
    private String storeName;

    // Fişten çıkarılan kategori (Gıda, Ulaşım, Market vb.)
    private String category;

    // Harcamanın tipi: "Gelir" veya "Gider"
    @Builder.Default
    private String type = "Gider";

    // Fiş üzerindeki harcama tarihi (Örn: "2026-05-31T11:30:00")
    private String expenseDate;

    // Fişten çıkarılan detaylı ürün listesi
    @Builder.Default
    private List<ExpenseItemAnalysisResult> items = new java.util.ArrayList<>();
}
