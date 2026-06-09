package org.game.szurmonej.config;

import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;

@Component
public class StartupDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDataLoader.class);

    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final ClassMembershipRepository classMembershipRepository;
    private final PasswordEncoder passwordEncoder;

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
                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.childRepository = childRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
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
            treasurer.setAccount(account);

            userRepository.save(treasurer);

            SchoolClass schoolClass = new SchoolClass();
            schoolClass.setLabel("Klasa " + i);
            schoolClass.setTreasurer(treasurer);
            schoolClassRepository.save(schoolClass);
            classes.add(schoolClass);
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
            parent.setAccount(account);

            userRepository.save(parent);

            // Create 2 children
            for (int j = 0; j < 2; j++) {
                Child child = new Child();
                child.setName("Dziecko" + childCounter);
                child.setSurname("Nazwisko" + i);
                child.setDateOfBirth(LocalDate.of(2010 + j, 1, 1));
                childRepository.save(child);

                // Assign parent-child mapping using Set.of
                parent.setChildren(parent.getChildren() == null ? Set.of(child) : 
                    new java.util.HashSet<>(parent.getChildren()) {{ add(child); }});
                // Note: user.setChildren may need hibernate sync, let's just update the set and save parent again.

                // Assign to class: Each child in sequentially a different class
                SchoolClass assignedClass = classes.get((childCounter - 1) % classes.size());
                ClassMembership membership = new ClassMembership();
                membership.setChild(child);
                membership.setSchoolClass(assignedClass);
                membership.setJoinedAt(LocalDate.now());
                classMembershipRepository.save(membership);

                childCounter++;
            }
            userRepository.save(parent); // save child references
        }

        log.info("Test data seeded successfully.");
    }
}
