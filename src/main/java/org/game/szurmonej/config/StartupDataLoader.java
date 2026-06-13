package org.game.szurmonej.config;

import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.repository.UserRepository;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.ClassMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class StartupDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDataLoader.class);

    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResourceLoader resourceLoader;
    private byte[] defaultAvatarBytes;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@example.com}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public StartupDataLoader(UserRepository userRepository,
                             ChildRepository childRepository,
                             SchoolClassRepository schoolClassRepository,
                             ClassMembershipRepository classMembershipRepository,
                             AccountRepository accountRepository,
                             PasswordEncoder passwordEncoder,
                             ResourceLoader resourceLoader) {
        this.userRepository = userRepository;
        this.childRepository = childRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.resourceLoader = resourceLoader;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        loadDefaultAvatar();
        
        Optional<User> existingAdmin = userRepository.findByUsername(adminUsername);
        if (existingAdmin.isEmpty()) {
            String plainPassword = adminPassword;
            boolean generated = false;
            if (plainPassword == null || plainPassword.isBlank()) {
                plainPassword = "admin";
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
            account.setBalance(new BigDecimal("500.00"));
            admin.setAccount(account);

            userRepository.save(admin);

            if (generated) {
                log.info("Created admin user '{}' with generated password: {}", adminUsername, plainPassword);
            } else {
                log.info("Created admin user '{}'", adminUsername);
            }
        } else {
            log.info("Admin user '{}' already exists.", adminUsername);
        }

        if (userRepository.findByUsername("Rodzic1").isPresent()) {
            log.info("Test data already exists, skipping test data seeding.");
            return;
        }

        log.info("Seeding test data...");

        // Create 4 Treasurers and 4 Classes
        List<SchoolClass> classes = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            User treasurer = new User();
            treasurer.setUsername("Skarbnik" + i);
            treasurer.setEmail("skarbnik" + i + "@example.com");
            treasurer.setPasswordHash(passwordEncoder.encode("rodzic"));
            treasurer.setAdmin(false);

            Account account = new Account();
            account.setAccountNumber(UUID.randomUUID().toString());
            account.setUser(treasurer);
            account.setBalance(new BigDecimal("500.00"));
            treasurer.setAccount(account);
            
            userRepository.save(treasurer);

            Child treasurerChild = new Child();
            treasurerChild.setName("DzieckoSkarbnika" + i);
            treasurerChild.setSurname("Skarbnikowski" + i);
            treasurerChild.setDateOfBirth(LocalDate.of(2011, 1, 1));
            treasurerChild.setAvatar(defaultAvatarBytes);
            treasurerChild.setAvatarContentType("image/png");
            
            childRepository.save(treasurerChild);

            // Use mutable HashSet instead of immutable Set.of()
            treasurer.setChildren(new HashSet<>(Set.of(treasurerChild)));
            treasurerChild.setParents(new HashSet<>(Set.of(treasurer)));
            
            userRepository.save(treasurer);
            childRepository.save(treasurerChild);

            SchoolClass schoolClass = new SchoolClass();
            schoolClass.setLabel("Klasa " + i);
            schoolClass.setTreasurer(treasurer);
            schoolClassRepository.save(schoolClass);
            classes.add(schoolClass);
            
            ClassMembership membership = new ClassMembership();
            membership.setChild(treasurerChild);
            membership.setSchoolClass(schoolClass);
            membership.setJoinedAt(LocalDate.now());
            classMembershipRepository.save(membership);
        }

        // Create 10 Parents, each with 2 children
        int childCounter = 1;
        for (int i = 1; i <= 10; i++) {
            User parent = new User();
            parent.setUsername("Rodzic" + i);
            parent.setEmail("rodzic" + i + "@example.com");
            parent.setPasswordHash(passwordEncoder.encode("rodzic"));
            parent.setAdmin(false);

            Account account = new Account();
            account.setAccountNumber(UUID.randomUUID().toString());
            account.setUser(parent);
            account.setBalance(new BigDecimal("500.00"));
            parent.setAccount(account);

            userRepository.save(parent);

            Set<Child> parentChildren = new HashSet<>();
            for (int j = 0; j < 2; j++) {
                Child child = new Child();
                child.setName("Dziecko" + childCounter);
                child.setSurname("Nazwisko" + i);
                child.setDateOfBirth(LocalDate.of(2010 + j, 1, 1));
                child.setAvatar(defaultAvatarBytes);
                child.setAvatarContentType("image/png");
                
                childRepository.save(child);

                // Use mutable HashSet
                child.setParents(new HashSet<>(Set.of(parent)));
                parentChildren.add(child);

                SchoolClass assignedClass = classes.get((childCounter - 1) % classes.size());
                ClassMembership membership = new ClassMembership();
                membership.setChild(child);
                membership.setSchoolClass(assignedClass);
                membership.setJoinedAt(LocalDate.now());
                classMembershipRepository.save(membership);

                childCounter++;
            }
            parent.setChildren(parentChildren);
            userRepository.save(parent);
        }

        log.info("Test data seeded successfully.");
    }

    private void loadDefaultAvatar() {
        try {
            Resource resource = resourceLoader.getResource("classpath:avatar.png");
            try (InputStream inputStream = resource.getInputStream()) {
                this.defaultAvatarBytes = StreamUtils.copyToByteArray(inputStream);
            }
        } catch (IOException e) {
            log.error("Could not load default avatar from classpath:avatar.png. Default avatar will not be set.", e);
            this.defaultAvatarBytes = null;
        }
    }
}