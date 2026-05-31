package com.aibudget.assistant.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "expense_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Ürün adı (Örn: Ekmek, Tam Yağlı Süt)
    @Column(nullable = false)
    private String name;

    // Ürünün birim veya toplam fiyatı (Kuruş hassasiyeti için BigDecimal)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    // Üründen kaç adet alındığı
    @Column(nullable = false)
    private Integer quantity;

    // İlişki Tanımı: Birçok ürün tek bir harcamaya (Expense) aittir.
    // LAZY fetch kullanarak veritabanından gereksiz yere hemen çekilmesini engelliyoruz.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    @JsonBackReference // Jackson kütüphanesinin sonsuz döngüye (StackOverflow) girmesini engeller.
    private Expense expense;
}
