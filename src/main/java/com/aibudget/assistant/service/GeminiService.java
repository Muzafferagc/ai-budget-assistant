package com.aibudget.assistant.service;

import com.aibudget.assistant.dto.ExpenseAnalysisResult;
import com.aibudget.assistant.model.Expense;
import com.aibudget.assistant.model.ExpenseItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    // application.properties dosyasından API anahtarını okuyoruz
    @Value("${gemini.api.key}")
    private String apiKey;

    // Google Gemini 2.5 Flash API URL'i (2026 yılı güncel kararlı sürüm ve modeli)
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

    // Constructor Injection (Spring Boot için en ideal bağımlılık enjeksiyon yöntemidir)
    public GeminiService(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
    }

    /**
     * Yüklenen fiş görselini Google Gemini API'ye göndererek analiz eder.
     *
     * @param imageBytes Görselin byte dizisi
     * @param mimeType   Görselin tipi (Örn: image/jpeg, image/png)
     * @return Analiz edilmiş harcama verisi (DTO)
     */
    public ExpenseAnalysisResult analyzeReceipt(byte[] imageBytes, String mimeType) {
        // 1. Görsel byte dizisini Base64 formatına çeviriyoruz (API bu formatı bekler)
        String base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);

        // 2. Gemini API'nin beklediği JSON istek gövdesini (Request Body) oluşturuyoruz.
        // Kararlı v1 sürümünde şema doğrulama hatalarını (responseMimeType) tamamen aşmak için 
        // generationConfig alanını kaldırıyoruz. Yapay zekaya sadece JSON dönmesini prompt içinde dikte ediyoruz.
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of(
                    "parts", List.of(
                        Map.of("text", "Bu fiş veya fatura görselini analiz et. " +
                               "Toplam tutarı (amount), harcama yapılan mekanı/işletmeyi (storeName), " +
                               "harcama kategorisini (category - örn: Market, Gıda, Giyim, Ulaşım, Eğlence, Diğer) " +
                               "ve fiş üzerindeki tarihi (expenseDate - ISO 8601 formatında 'YYYY-MM-DDTHH:mm:ss' örn: 2026-05-31T11:30:00) çıkar. " +
                               "Eğer fiş üzerinde tarih net okunmuyorsa veya yoksa bugünün tarihini varsayılan olarak kabul et: " + java.time.LocalDateTime.now().toString().substring(0, 19) + ". " +
                               "Ek olarak, fişin içindeki tüm ürün kalemlerini (items) tek tek çıkar. " +
                               "Çok Önemli İndirim ve Matematik Kuralları:\n" +
                               "1. Fişte bir ürünün hemen altında geçen ve sonunda eksi (-) işareti olan satırlar o ürüne uygulanan indirimdir (Örn: '25TLFINISH110TL *149,00-'). " +
                               "Bu indirim tutarını, ait olduğu üstteki ürünün fiyatından düşerek o satırın NET fiyatını hesapla.\n" +
                               "2. Her ürün kalemi (items içindeki elemanlar) için: Ürün adını (name), adedini (quantity) ve o satırdaki ürünlerin indirimler düşülmüş NET TOPLAM fiyatını (price) oku.\n" +
                               "Örnek: Fişte 'FINISH QUANTUM ÖZEL *259.00' ve altında '25TLFINISH110TL *149.00-' geçiyorsa, bu ürünün net satır fiyatı 259.00 - 149.00 = 110.00 TL'dir. " +
                               "Eğer bu indirimli üründen fişte 2 kez geçiyorsa (art arda veya farklı yerlerde), bunları ya adedi 2 ve toplam fiyatı (price) 220.00 TL olan tek bir satırda birleştir ya da fişteki gibi adetleri 1 ve fiyatları 110.00 TL olan iki ayrı ürün kalemi olarak ekle.\n" +
                               "Çıktıyı tam olarak şu JSON şemasında ver:\n" +
                               "{\n" +
                               "  \"amount\": 125.50,\n" +
                               "  \"storeName\": \"Starbucks\",\n" +
                               "  \"category\": \"Gıda\",\n" +
                               "  \"expenseDate\": \"2026-05-31T11:30:00\",\n" +
                               "  \"items\": [\n" +
                               "    { \"name\": \"Latte\", \"price\": 85.00, \"quantity\": 1 },\n" +
                               "    { \"name\": \"Kurabiye\", \"price\": 40.50, \"quantity\": 1 }\n" +
                               "  ]\n" +
                               "}\n" +
                               "Lütfen yalnızca ve yalnızca JSON çıktısı dön. Başına veya sonuna markdown kod blokları (```json) veya ekstra açıklama ekleme."),
                        Map.of("inlineData", Map.of(
                            "mimeType", mimeType,
                            "data", base64Image
                        ))
                    )
                )
            )
        );

        try {
            // 3. Spring'in modern RestClient aracı ile POST isteği atıyoruz.
            String rawResponse = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            // 4. Gemini API yanıtındaki katmanlı JSON yapısını çözüp (parse edip) asıl metin alanını ayıklıyoruz.
            // Gemini yanıt formatı: candidates[0] -> content -> parts[0] -> text
            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            Map<String, Object> firstCandidate = candidates.get(0);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonText = (String) parts.get(0).get("text");

            // LLM çıktıları bazen markdown kod blokları (```json ... ```) veya ekstra boşluklar içerebilir.
            // Bu robust (dayanıklı) temizleme adımıyla sadece asıl JSON nesnesini ({...}) filtreleyip çıkarıyoruz.
            jsonText = jsonText.trim();
            if (jsonText.contains("```")) {
                int start = jsonText.indexOf("{");
                int end = jsonText.lastIndexOf("}") + 1;
                if (start >= 0 && end > start) {
                    jsonText = jsonText.substring(start, end);
                }
            }

            // 5. Ayıkladığımız JSON metnini doğrudan kendi DTO sınıfımıza (ExpenseAnalysisResult) map'liyoruz.
            return objectMapper.readValue(jsonText, ExpenseAnalysisResult.class);

        } catch (RestClientResponseException e) {
            throw handleRestClientException(e, "Gemini API analizi sırasında sunucu hatası oluştu");
        } catch (Exception e) {
            throw new RuntimeException("Gemini API analizi sırasında bir hata oluştu: " + e.getMessage(), e);
        }
    }

    /**
     * Kullanıcının harcama geçmişini akıllı bir bütçe promptu olarak hazırlar ve 
     * Gemini 2.5 Flash modeline göndererek bütçe tavsiyesi (danışmanlık) alır.
     *
     * @param userMessage Kullanıcının sohbet botuna yazdığı soru
     * @param expenses    Veritabanından çekilen tüm harcama ve ürün kayıtları
     * @return Yapay zekanın Türkçe tavsiye yanıtı
     */
    public String chatWithBudget(String userMessage, List<Expense> expenses) {
        // 1. Veritabanındaki tüm harcama geçmişini yapay zeka için kurumsal bir bağlam (Context) haline getiriyoruz.
        StringBuilder context = new StringBuilder();
        context.append("Sen 'AI Budget Assistant' uygulamasındaki akıllı, tecrübeli ve güler yüzlü bir finansal danışmansın. ")
               .append("Kullanıcı seninle bütçesi, tasarruf yöntemleri ve harcamaları hakkında konuşmak istiyor. ")
               .append("Aşağıda kullanıcının veritabanındaki güncel harcama ve fiş kayıtları listelenmiştir. ")
               .append("Bu verileri analiz ederek kullanıcının sorusuna profesyonel, motive edici, net ve samimi bir dille Türkçe yanıt ver.\n\n")
               .append("KULLANICI HARCAMA GEÇMİŞİ VE SATIN ALINAN ÜRÜNLER:\n");

        if (expenses.isEmpty()) {
            context.append("- Henüz veritabanında kayıtlı bir harcama bulunmuyor. Kullanıcıya ilk fişini yüklemesi için nazikçe rehberlik et.\n");
        } else {
            for (Expense exp : expenses) {
                context.append(String.format("- Tarih: %s, Yer: %s, Kategori: %s, Tutar: ₺%.2f\n",
                    exp.getExpenseDate().toString().substring(0, 10),
                    exp.getStoreName(),
                    exp.getCategory(),
                    exp.getAmount()));
                
                if (exp.getItems() != null && !exp.getItems().isEmpty()) {
                    context.append("  Alınan Ürün Detayları:\n");
                    for (ExpenseItem item : exp.getItems()) {
                        context.append(String.format("    * %s x%d (₺%.2f)\n",
                            item.getName(), item.getQuantity(), item.getPrice()));
                    }
                }
            }
        }

        // Kullanıcının güncel sorusunu bağlamın sonuna ekliyoruz
        context.append("\nKullanıcının Sorusu: ").append(userMessage).append("\n\nAkıllı Bütçe Danışmanı Yanıtı:");

        // 2. Gemini API'nin beklediği istek gövdesini oluşturuyoruz
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of(
                    "parts", List.of(
                        Map.of("text", context.toString())
                    )
                )
            )
        );

        try {
            // 3. RestClient ile POST isteğimizi gönderiyoruz
            String rawResponse = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            // 4. Yanıtı çözümlüyoruz (candidates[0] -> content -> parts[0] -> text)
            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            Map<String, Object> firstCandidate = candidates.get(0);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            
            return (String) parts.get(0).get("text");

        } catch (RestClientResponseException e) {
            throw handleRestClientException(e, "Sohbet robotu analizi sırasında sunucu hatası oluştu");
        } catch (Exception e) {
            throw new RuntimeException("Sohbet robotu analizi sırasında bir hata oluştu: " + e.getMessage(), e);
        }
    }

    /**
     * Kullanıcının serbest metin olarak girdiği harcama cümlesini analiz eder
     * ve yapılandırılmış JSON nesnesine (ExpenseAnalysisResult) dönüştürür.
     *
     * @param message Kullanıcının girdiği harcama cümlesi
     * @return Analiz edilmiş harcama verisi (DTO)
     */
    public ExpenseAnalysisResult parseQuickInput(String message) {
        // Yapay zekaya cümlenin içinden harcama veya gelir detaylarını çıkarmasını dikte eden prompt
        String prompt = "Aşağıdaki doğal dilde yazılmış bütçe (gelir veya gider) ifadesini analiz et. " +
                "Toplam tutarı (amount), harcama yapılan veya gelirin alındığı mekanı/kaynağı (storeName), " +
                "kategorisini (category - örn: Market, Gıda, Giyim, Ulaşım, Eğlence, Faturalar, Maaş, Freelance, Yatırım, Kredi Kartı, Diğer. Eğer ifade kredi kartı ödemesi, kredi kartı borcu, kart borcu yatırma, kredi kartına ödeme gibi kredi kartı ile ilgili işlemler barındırıyorsa kategoriyi kesinlikle 'Kredi Kartı' olarak ata) " +
                "kaydın tipini (type - eğer para kazanma, maaş, kar, hediye vb. bir durumsa 'Gelir', eğer para harcama, satın alma, ödeme, fatura vb. bir durumsa 'Gider') " +
                "ve işlem tarihini (expenseDate - ISO 8601 formatında 'YYYY-MM-DDTHH:mm:ss' örn: 2026-05-31T11:30:00) çıkar. " +
                "Eğer cümlede tarih geçmiyorsa varsayılan olarak şu anın tarihini kabul et: " + java.time.LocalDateTime.now().toString().substring(0, 19) + ". " +
                "Eğer cümlede spesifik ürün detayları geçiyorsa (Örn: 'kahve aldım', '2 kutu süt aldım'), bunları da items listesine tek tek ekle. " +
                "Her ürün kalemi (items içindeki elemanlar) için: Ürün adını (name), adedini (quantity) ve o satırdaki ürünlerin TOPLAM fiyatını (price) oku. " +
                "Eğer items boş kalırsa boş dizi dön.\n\n" +
                "Çıktıyı tam olarak şu JSON şemasında ver:\n" +
                "{\n" +
                "  \"amount\": 120.00,\n" +
                "  \"storeName\": \"Starbucks\",\n" +
                "  \"category\": \"Gıda\",\n" +
                "  \"type\": \"Gider\",\n" +
                "  \"expenseDate\": \"2026-05-31T11:30:00\",\n" +
                "  \"items\": [\n" +
                "    { \"name\": \"Kahve\", \"price\": 120.00, \"quantity\": 1 }\n" +
                "  ]\n" +
                "}\n" +
                "Lütfen yalnızca ve yalnızca JSON çıktısı dön. Başına veya sonuna markdown kod blokları (```json) veya ekstra açıklama ekleme.\n\n" +
                "Kullanıcı Cümlesi: \"" + message + "\"";

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of(
                    "parts", List.of(
                        Map.of("text", prompt)
                    )
                )
            )
        );

        try {
            String rawResponse = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            Map<String, Object> firstCandidate = candidates.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonText = (String) parts.get(0).get("text");

            jsonText = jsonText.trim();
            if (jsonText.contains("```")) {
                int start = jsonText.indexOf("{");
                int end = jsonText.lastIndexOf("}") + 1;
                if (start >= 0 && end > start) {
                    jsonText = jsonText.substring(start, end);
                }
            }

            return objectMapper.readValue(jsonText, ExpenseAnalysisResult.class);
        } catch (RestClientResponseException e) {
            throw handleRestClientException(e, "Doğal dil harcama analizi sırasında sunucu hatası oluştu");
        } catch (Exception e) {
            throw new RuntimeException("Doğal dil harcama analizi sırasında hata oluştu: " + e.getMessage(), e);
        }
    }

    /**
     * Veritabanındaki harcama ve ürün geçmişini yapay zeka ile analiz eder,
     * Finansal Sağlık Skoru üretir ve kişiselleştirilmiş tasarruf tavsiyeleri döner.
     *
     * @param expenses Veritabanındaki tüm harcamalar
     * @return Yapay zekanın ürettiği Markdown formatında analiz raporu
     */
    public String generateFinancialReport(List<Expense> expenses) {
        StringBuilder context = new StringBuilder();
        context.append("Sen 'AI Budget Assistant' uygulamasının akıllı ve kıdemli finansal analiz motorusun. ")
               .append("Görevin, kullanıcının aşağıda verilen tüm harcama geçmişini inceleyip detaylı bir 'Finansal Durum Raporu' oluşturmaktır.\n\n")
               .append("Kullanıcı Harcama Geçmişi:\n");

        if (expenses.isEmpty()) {
            context.append("- Henüz kayıtlı harcama bulunmuyor.\n");
        } else {
            for (Expense exp : expenses) {
                context.append(String.format("- Tarih: %s, Yer: %s, Kategori: %s, Tutar: ₺%.2f\n",
                    exp.getExpenseDate().toString().substring(0, 10),
                    exp.getStoreName(),
                    exp.getCategory(),
                    exp.getAmount()));
                if (exp.getItems() != null && !exp.getItems().isEmpty()) {
                    for (ExpenseItem item : exp.getItems()) {
                        context.append(String.format("    * %s x%d (₺%.2f)\n",
                            item.getName(), item.getQuantity(), item.getPrice()));
                    }
                }
            }
        }

        context.append("\nAnalizi yaparken mutlaka ve kesinlikle şu iki çıktıyı üret:\n")
               .append("1. 'Finansal Sağlık Skoru': Kullanıcının bütçe durumuna göre 0 ile 100 arasında bir tam sayı puanı ver. ")
               .append("Bu skoru yanıtının en başında tam olarak şu şablonda belirt: '[SCORE]85[/SCORE]'. ")
               .append("Bu şablon dışına hiçbir şey yazma (örn: '[SCORE]75[/SCORE]' şeklinde olmalı).\n")
               .append("2. Rapor Detayları: Markdown formatında, samimi, teşvik edici ve profesyonel bir dille:\n")
               .append("   - Harcama Analizi: Hangi kategorilerde çok harcandığı ve israf riski olan kalemler.\n")
               .append("   - Kişiselleştirilmiş 3 Tasarruf Tavsiyesi: Kullanıcının gerçek harcamalarından yola çıkan somut öneriler.\n")
               .append("   - Bütçe Limit Önerileri: Hangi limitleri daraltması gerektiği.\n\n")
               .append("Lütfen Türkçe dilinde, şık Markdown başlıkları (###, ** vb.) kullanarak yanıt ver.");

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of(
                    "parts", List.of(
                        Map.of("text", context.toString())
                    )
                )
            )
        );

        try {
            String rawResponse = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            Map<String, Object> responseMap = objectMapper.readValue(rawResponse, Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            Map<String, Object> firstCandidate = candidates.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            
            return (String) parts.get(0).get("text");
        } catch (RestClientResponseException e) {
            throw handleRestClientException(e, "Analiz raporu üretilirken sunucu hatası oluştu");
        } catch (Exception e) {
            throw new RuntimeException("Analiz raporu üretilirken hata oluştu: " + e.getMessage(), e);
        }
    }

    /**
     * Gemini API'den dönen HTTP hata kodlarını (RestClientResponseException) yakalayarak
     * kullanıcıya anlamlı Türkçe hata mesajları üretir.
     */
    private RuntimeException handleRestClientException(RestClientResponseException e, String contextMessage) {
        String responseBody = e.getResponseBodyAsString();
        String errorMessage = e.getMessage();
        
        try {
            Map<?, ?> errorMap = objectMapper.readValue(responseBody, Map.class);
            if (errorMap.containsKey("error")) {
                Object errorObj = errorMap.get("error");
                if (errorObj instanceof Map) {
                    Map<?, ?> errorDetails = (Map<?, ?>) errorObj;
                    if (errorDetails.containsKey("message")) {
                        errorMessage = (String) errorDetails.get("message");
                    }
                }
            }
        } catch (Exception ignored) {
            // JSON ayrıştırma hatası durumunda ham mesaja geri döner
        }

        int statusCode = e.getStatusCode().value();
        if (statusCode == 429) {
            return new RuntimeException("Gemini API kota limitiniz doldu (429 Too Many Requests). Lütfen ücretsiz kotanın sıfırlanması için yaklaşık 1 dakika bekleyip tekrar deneyin.");
        } else if (statusCode == 400) {
            if (errorMessage != null && (errorMessage.contains("API key not valid") || errorMessage.contains("key"))) {
                return new RuntimeException("Geçersiz Gemini API Anahtarı! Lütfen application.properties dosyasındaki 'gemini.api.key' değerinin doğru olduğundan emin olun.");
            }
            return new RuntimeException("Gemini API isteği geçersiz (400 Bad Request): " + errorMessage);
        } else if (statusCode == 403) {
            return new RuntimeException("Gemini API erişimi engellendi (403 Forbidden). Lütfen API anahtarınızın bu servise erişim izni olduğundan emin olun.");
        }

        return new RuntimeException(contextMessage + " (HTTP " + statusCode + "): " + errorMessage, e);
    }
}
