package org.game.szurmonej.config;

import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class StartupDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDataLoader.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@example.com}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public StartupDataLoader(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        Optional<User> existing = userRepository.findByUsername(adminUsername);
        if (existing.isPresent()) {
            log.info("Admin user '{}' already exists, skipping seeding.", adminUsername);
            return;
        }

        String plainPassword = adminPassword;
        boolean generated = false;
        if (plainPassword == null || plainPassword.isBlank()) {
            plainPassword = UUID.randomUUID().toString();
            generated = true;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode(plainPassword));
        admin.setAdmin(true);

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setUser(admin);
        admin.setAccount(account);

        userRepository.save(admin);

        if (generated) {
            log.info("Created admin user '{}' with generated password: {}", adminUsername, plainPassword);
        } else {
            log.info("Created admin user '{}'", adminUsername);
        }
    }
}

