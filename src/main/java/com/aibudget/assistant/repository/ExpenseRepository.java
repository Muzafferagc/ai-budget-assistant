package com.aibudget.assistant.repository;

import com.aibudget.assistant.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    
    // Kategoriye göre filtreleme yapabilmek için özel bir Spring Data JPA sorgu metodu
    List<Expense> findByCategory(String category);

    // Mekan adına göre harcamaları listelemek için (büyük/küçük harf duyarsız)
    List<Expense> findByStoreNameContainingIgnoreCase(String storeName);

    // Kullanıcı bazlı harcamaları listelemek için (Multi-User SaaS)
    List<Expense> findByUserId(Long userId);
    List<Expense> findByUserIdOrderByExpenseDateDesc(Long userId);
}
