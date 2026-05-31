package com.aibudget.assistant.controller;

import com.aibudget.assistant.dto.ChatRequestDto;
import com.aibudget.assistant.dto.ChatResponseDto;
import com.aibudget.assistant.dto.ExpenseAnalysisResult;
import com.aibudget.assistant.model.Expense;
import com.aibudget.assistant.model.ExpenseItem;
import com.aibudget.assistant.model.User;
import com.aibudget.assistant.repository.ExpenseRepository;
import com.aibudget.assistant.repository.UserRepository;
import com.aibudget.assistant.service.GeminiService;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*") // React frontend uygulamasının (farklı bir portta çalışacak) backend ile konuşabilmesi için CORS izni veriyoruz.
@RequiredArgsConstructor
public class ExpenseController {

    private final GeminiService geminiService;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    /**
     * Kullanıcının yüklediği fiş görselini alır, Gemini API ile analiz eder,
     * analiz sonuçlarını H2 veritabanına kaydeder ve kaydedilen veriyi istemciye döner.
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAndAnalyzeReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            User user = getOrCreateUser(userId);

            // 1. Yüklenen dosyanın içeriğini byte dizisi olarak ve tipini (MIME) alıyoruz
            byte[] bytes = file.getBytes();
            String contentType = file.getContentType();

            // 1.1. Görseli disk üzerine 'uploads/' klasörüne arşivleme
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            java.io.File uploadDir = new java.io.File("./uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            java.io.File destFile = new java.io.File(uploadDir.getAbsolutePath(), fileName);
            java.nio.file.Files.copy(file.getInputStream(), destFile.toPath(),
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            String baseUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
            String receiptImageUrl = baseUrl + "/uploads/" + fileName;

            // 2. GeminiService aracılığıyla yapay zeka analizini başlatıyoruz
            ExpenseAnalysisResult analysisResult = geminiService.analyzeReceipt(bytes, contentType);

            // 3. Yapay zekadan gelen String formatındaki tarihi LocalDateTime formatına parse ediyoruz.
            LocalDateTime expenseDate;
            try {
                expenseDate = LocalDateTime.parse(analysisResult.getExpenseDate(),
                        DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception e) {
                expenseDate = LocalDateTime.now();
            }

            // 4. Veritabanına kaydetmek üzere Expense Entity nesnemizi Builder pattern ile inşa ediyoruz
            Expense expense = Expense.builder()
                    .amount(analysisResult.getAmount())
                    .storeName(analysisResult.getStoreName())
                    .category(analysisResult.getCategory())
                    .expenseDate(expenseDate)
                    .receiptImageUrl(receiptImageUrl) // Arşivlenen görselin tam url'i
                    .user(user) // Kayıt hangi kullanıcıya aitse onunla ilişkilendiriyoruz
                    .build();

            // 4.1. Ürün detay listesini parent 'expense' nesnesine bağlıyoruz.
            if (analysisResult.getItems() != null && !analysisResult.getItems().isEmpty()) {
                List<ExpenseItem> items = analysisResult.getItems().stream()
                        .map(dtoItem -> ExpenseItem.builder()
                                .name(dtoItem.getName())
                                .price(dtoItem.getPrice())
                                .quantity(dtoItem.getQuantity())
                                .expense(expense) // Çift yönlü ilişki
                                .build())
                        .collect(Collectors.toList());
                expense.setItems(items);
            }

            Expense savedExpense = expenseRepository.save(expense);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Sunucu hatası"));
        }
    }

    /**
     * Veritabanında oturum açmış kullanıcıya ait olan tüm bütçe kayıtlarını listeler.
     */
    @GetMapping
    public ResponseEntity<List<Expense>> getAllExpenses(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User user = getOrCreateUser(userId);
        List<Expense> expenses = expenseRepository.findByUserIdOrderByExpenseDateDesc(user.getId());
        return ResponseEntity.ok(expenses);
    }

    /**
     * Kullanıcının manuel olarak girdiği harcama/gelir verisini alır, veritabanına kaydeder.
     */
    @PostMapping
    public ResponseEntity<Expense> createExpenseManual(
            @RequestBody Expense expense,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (expense == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            User user = getOrCreateUser(userId);
            expense.setUser(user); // Kullanıcı ilişkisini atıyoruz

            if (expense.getExpenseDate() == null) {
                expense.setExpenseDate(LocalDateTime.now());
            }

            if (expense.getItems() != null && !expense.getItems().isEmpty()) {
                for (ExpenseItem item : expense.getItems()) {
                    item.setExpense(expense);
                }
            }

            Expense savedExpense = expenseRepository.save(expense);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Belirli bir bütçe kaydını ID bilgisine göre veritabanından siler.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (!expenseRepository.existsById(id)) {
            return ResponseEntity.noContent().build();
        }
        
        // Güvenlik: Kayıt silme yetki kontrolü de yapılabilir
        expenseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Kullanıcının harcamalarıyla ilgili yapay zekaya sorduğu soruları sadece kendi verilerini baz alarak yanıtlar (RAG).
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAssistant(
            @RequestBody ChatRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (requestDto == null || requestDto.getMessage() == null || requestDto.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            User user = getOrCreateUser(userId);
            // Sadece bu kullanıcıya ait harcamaları çekerek RAG bağlamı kuruyoruz
            List<Expense> expenses = expenseRepository.findByUserId(user.getId());

            String assistantResponse = geminiService.chatWithBudget(requestDto.getMessage(), expenses);
            return ResponseEntity.ok(new ChatResponseDto(assistantResponse));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Sunucu hatası"));
        }
    }

    /**
     * Doğal dilde girilen harcama/gelir metnini Gemini ile çözümler ve kullanıcıya özel kaydeder.
     */
    @PostMapping("/quick-input")
    public ResponseEntity<?> createExpenseQuickInput(
            @RequestBody ChatRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (requestDto == null || requestDto.getMessage() == null || requestDto.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            User user = getOrCreateUser(userId);
            ExpenseAnalysisResult analysisResult = geminiService.parseQuickInput(requestDto.getMessage());

            LocalDateTime expenseDate;
            try {
                expenseDate = LocalDateTime.parse(analysisResult.getExpenseDate(), java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception e) {
                expenseDate = LocalDateTime.now();
            }

            Expense expense = Expense.builder()
                .amount(analysisResult.getAmount())
                .storeName(analysisResult.getStoreName())
                .category(analysisResult.getCategory())
                .type(analysisResult.getType() != null ? analysisResult.getType() : "Gider")
                .expenseDate(expenseDate)
                .receiptImageUrl(null)
                .user(user) // Kullanıcı ataması
                .build();

            if (analysisResult.getItems() != null && !analysisResult.getItems().isEmpty()) {
                List<ExpenseItem> items = analysisResult.getItems().stream()
                    .map(dtoItem -> ExpenseItem.builder()
                        .name(dtoItem.getName())
                        .price(dtoItem.getPrice())
                        .quantity(dtoItem.getQuantity())
                        .expense(expense)
                        .build())
                    .collect(Collectors.toList());
                expense.setItems(items);
            }

            Expense savedExpense = expenseRepository.save(expense);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Sunucu hatası"));
        }
    }

    /**
     * Sadece oturum açmış kullanıcının harcamalarına özel Yapay Zekalı Finans Sağlık Raporu üretir.
     */
    @PostMapping("/analysis-report")
    public ResponseEntity<?> getFinancialReport(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        try {
            User user = getOrCreateUser(userId);
            List<Expense> expenses = expenseRepository.findByUserId(user.getId());
            String reportText = geminiService.generateFinancialReport(expenses);
            return ResponseEntity.ok(new ChatResponseDto(reportText));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Sunucu hatası"));
        }
    }

    /**
     * Belirli bir bütçe kaydını günceller.
     */
    @PutMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> updateExpense(
            @PathVariable Long id, 
            @RequestBody Expense updatedExpense,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return expenseRepository.findById(id).map(existingExpense -> {
            try {
                User user = getOrCreateUser(userId);
                existingExpense.setUser(user);
                
                existingExpense.setStoreName(updatedExpense.getStoreName());
                existingExpense.setAmount(updatedExpense.getAmount());
                existingExpense.setCategory(updatedExpense.getCategory());
                
                if (updatedExpense.getType() != null) {
                    existingExpense.setType(updatedExpense.getType());
                }
                
                if (updatedExpense.getExpenseDate() != null) {
                    existingExpense.setExpenseDate(updatedExpense.getExpenseDate());
                }

                existingExpense.getItems().clear();
                if (updatedExpense.getItems() != null) {
                    for (ExpenseItem newItem : updatedExpense.getItems()) {
                        newItem.setExpense(existingExpense);
                        existingExpense.getItems().add(newItem);
                    }
                }

                Expense saved = expenseRepository.save(existingExpense);
                return ResponseEntity.ok(saved);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(java.util.Map.of("message", "Güncelleme sırasında hata oluştu: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Arşivlenmiş fiş görselini yeniden analiz eder ve kaydı günceller.
     */
    @PostMapping("/{id}/reanalyze")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> reanalyzeExpenseReceipt(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return expenseRepository.findById(id).map(existingExpense -> {
            try {
                User user = getOrCreateUser(userId);
                existingExpense.setUser(user);

                String imageUrl = existingExpense.getReceiptImageUrl();
                if (imageUrl == null || imageUrl.trim().isEmpty()) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Bu harcama kaydına ait arşivlenmiş bir fiş görseli bulunmuyor."));
                }

                String fileName = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
                java.io.File receiptFile = new java.io.File("./uploads", fileName);

                if (!receiptFile.exists()) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(java.util.Map.of("message", "Fiş görseli sunucu diskinde bulunamadı."));
                }

                byte[] bytes = java.nio.file.Files.readAllBytes(receiptFile.toPath());
                
                String contentType = "image/jpeg";
                if (fileName.toLowerCase().endsWith(".png")) {
                    contentType = "image/png";
                } else if (fileName.toLowerCase().endsWith(".webp")) {
                    contentType = "image/webp";
                }

                ExpenseAnalysisResult analysisResult = geminiService.analyzeReceipt(bytes, contentType);

                existingExpense.setAmount(analysisResult.getAmount());
                existingExpense.setStoreName(analysisResult.getStoreName());
                existingExpense.setCategory(analysisResult.getCategory());
                
                if (analysisResult.getType() != null) {
                    existingExpense.setType(analysisResult.getType());
                }

                existingExpense.getItems().clear();
                if (analysisResult.getItems() != null && !analysisResult.getItems().isEmpty()) {
                    List<ExpenseItem> newItems = analysisResult.getItems().stream()
                            .map(dtoItem -> ExpenseItem.builder()
                                    .name(dtoItem.getName())
                                    .price(dtoItem.getPrice())
                                    .quantity(dtoItem.getQuantity())
                                    .expense(existingExpense)
                                    .build())
                            .collect(Collectors.toList());
                    existingExpense.getItems().addAll(newItems);
                }

                Expense savedExpense = expenseRepository.save(existingExpense);
                return ResponseEntity.ok(savedExpense);

            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(java.util.Map.of("message", "Yeniden analiz sırasında sunucu hatası oluştu: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Oturum açmış olan X-User-Id kullanıcısını veri tabanından sorgular.
     * Eğer ID belirtilmemişse geriye dönük uyumluluk adına default_user (ID 1) döndürür.
     */
    private User getOrCreateUser(Long userId) {
        if (userId == null) {
            return userRepository.findById(1L).orElseGet(() -> {
                User defaultUser = User.builder()
                        .username("default_user")
                        .password("default_password_hash")
                        .build();
                return userRepository.save(defaultUser);
            });
        }
        return userRepository.findById(userId).orElseThrow(() -> 
                new RuntimeException("Kullanıcı bulunamadı (ID: " + userId + ")"));
    }
}
