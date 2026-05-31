package com.aibudget.assistant.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Her harcama/gelir kaydı belirli bir kullanıcıya ait olmalıdır
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    // Harcama tipi: "Gelir" veya "Gider"
    @Column(name = "type", nullable = false)
    @Builder.Default
    private String type = "Gider";

    // İlişki Tanımı: Bir harcamanın içinde birden çok ürün kalemi olabilir.
    // CascadeType.ALL sayesinde harcama kaydedildiğinde içindeki ürünler de otomatik kaydedilir.
    @JsonManagedReference
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ExpenseItem> items = new java.util.ArrayList<>();

    // Fişteki toplam tutar. Finansal verilerde hassasiyet kaybını önlemek için BigDecimal kullanıyoruz.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // Harcamanın yapıldığı yer / mekan adı (Örn: Starbucks)
    @Column(name = "store_name", nullable = false)
    private String storeName;

    // Harcama kategorisi (Örn: Gıda, Ulaşım)
    @Column(nullable = false)
    private String category;

    // Fiş üzerindeki harcama tarihi
    @Column(name = "expense_date")
    private LocalDateTime expenseDate;

    // Analiz edilen fiş görselinin dosya yolu veya URL'i
    @Column(name = "receipt_image_url")
    private String receiptImageUrl;

    // Veritabanına kayıt atılma tarihi (Audit amaçlı)
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Kayıt oluşturulurken oluşturma tarihini otomatik doldurmak için JPA PrePersist tetikleyicisi
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
