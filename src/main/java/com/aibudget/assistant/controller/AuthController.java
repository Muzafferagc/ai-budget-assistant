package com.aibudget.assistant.controller;

import com.aibudget.assistant.model.User;
import com.aibudget.assistant.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    /**
     * Yeni bir kullanıcı hesabını güvenli bir şekilde kaydeder.
     *
     * @param registerRequest Kullanıcı adı, şifre ve email içeren istek
     * @return Kaydedilen User nesnesi (şifre gizlenerek)
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> registerRequest) {
        String username = registerRequest.get("username");
        String password = registerRequest.get("password");
        String email = registerRequest.get("email");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı adı ve şifre boş bırakılamaz."));
        }

        username = username.trim();

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Bu kullanıcı adı zaten alınmış."));
        }

        try {
            // Şifreyi SHA-256 ile hash'liyoruz
            String hashedPassword = hashPassword(password);

            User user = User.builder()
                    .username(username)
                    .password(hashedPassword)
                    .email(email)
                    .build();

            User savedUser = userRepository.save(user);

            // Güvenlik gerekçesiyle şifreyi istemciye geri göndermiyoruz
            savedUser.setPassword(null);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Kayıt sırasında hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcı kimlik bilgilerini doğrular ve oturum açtırır.
     *
     * @param loginRequest Kullanıcı adı ve şifre içeren istek
     * @return Kullanıcı oturum bilgileri
     */
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı adı ve şifre boş bırakılamaz."));
        }

        username = username.trim();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Geçersiz kullanıcı adı veya şifre."));
        }

        User user = userOpt.get();
        String hashedPassword = hashPassword(password);

        if (!user.getPassword().equals(hashedPassword)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Geçersiz kullanıcı adı veya şifre."));
        }

        // Başarılı giriş
        // Güvenlik için şifre alanını temizleyip dönüyoruz
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    /**
     * Kullanıcı şifresini sıfırlar (Kullanıcı adı ve email doğrulaması ile).
     *
     * @param resetRequest Kullanıcı adı, e-posta adresi ve yeni şifre içeren istek
     * @return Başarı veya hata mesajı
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> resetRequest) {
        String username = resetRequest.get("username");
        String email = resetRequest.get("email");
        String newPassword = resetRequest.get("newPassword");

        if (username == null || username.trim().isEmpty() || 
            email == null || email.trim().isEmpty() || 
            newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı adı, e-posta ve yeni şifre boş bırakılamaz."));
        }

        username = username.trim();
        email = email.trim();

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Girilen kullanıcı adı sistemde bulunamadı."));
        }

        User user = userOpt.get();
        // E-posta eşleşmesini kontrol et (büyük/küçük harf duyarsız)
        if (user.getEmail() == null || !user.getEmail().trim().equalsIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "E-posta adresi bu kullanıcı adı ile eşleşmiyor."));
        }

        try {
            String hashedPassword = hashPassword(newPassword);
            user.setPassword(hashedPassword);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Şifre sıfırlama sırasında hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Google ile Giriş Yap & Kayıt Ol (Şifresiz Kimlik Doğrulama)
     *
     * @param googleRequest Google'dan gelen email ve name içeren istek
     * @return Oturum açan User nesnesi (şifre gizlenerek)
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> googleRequest) {
        String email = googleRequest.get("email");
        String name = googleRequest.get("name");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Google e-posta adresi boş olamaz."));
        }

        email = email.trim();
        name = name != null ? name.trim() : "";

        // E-posta adresiyle eşleşen bir kullanıcı var mı?
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            // Kullanıcı zaten var, doğrudan giriş yap (şifresiz)
            User user = userOpt.get();
            user.setPassword(null);
            return ResponseEntity.ok(user);
        }

        // Kullanıcı yoksa otomatik kayıt et
        try {
            // E-posta prefix'inden kullanıcı adı türet
            String baseUsername = email.split("@")[0];
            String username = baseUsername;
            
            // Eğer çakışma varsa sonuna rakam ekle
            int count = 1;
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + count;
                count++;
            }

            // Rastgele, kırılması imkansız bir şifre üret
            String randomPassword = java.util.UUID.randomUUID().toString();
            String hashedPassword = hashPassword(randomPassword);

            User user = User.builder()
                    .username(username)
                    .password(hashedPassword)
                    .email(email)
                    .build();

            User savedUser = userRepository.save(user);
            savedUser.setPassword(null);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Google ile kayıt sırasında hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Şifreyi güvenli biçimde SHA-256 algoritmasıyla hash'ler.
     */
    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Şifre hash'leme sırasında beklenmeyen hata", e);
        }
    }
}
