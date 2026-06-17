package org.game.szurmonej.config;

import org.game.szurmonej.entity.*;
import org.game.szurmonej.repository.*;
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

import jakarta.persistence.EntityManager;
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
    private final FundraiserRepository fundraiserRepository;
    private final FundraiserParticipantRepository fundraiserParticipantRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResourceLoader resourceLoader;
    private final EntityManager entityManager;
    private byte[] defaultAvatarBytes;

    @Value("${app.admin.email:admin@example.com}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public StartupDataLoader(UserRepository userRepository,
                             ChildRepository childRepository,
                             SchoolClassRepository schoolClassRepository,
                             ClassMembershipRepository classMembershipRepository,
                             AccountRepository accountRepository,
                             FundraiserRepository fundraiserRepository,
                             FundraiserParticipantRepository fundraiserParticipantRepository,
                             PasswordEncoder passwordEncoder,
                             ResourceLoader resourceLoader,
                             EntityManager entityManager) {
        this.userRepository = userRepository;
        this.childRepository = childRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.classMembershipRepository = classMembershipRepository;
        this.accountRepository = accountRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.fundraiserParticipantRepository = fundraiserParticipantRepository;
        this.passwordEncoder = passwordEncoder;
        this.resourceLoader = resourceLoader;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        loadDefaultAvatar();
        
        Optional<User> existingAdmin = userRepository.findByEmail(adminEmail);
        if (existingAdmin.isEmpty()) {
            String plainPassword = adminPassword;
            boolean generated = false;
            if (plainPassword == null || plainPassword.isBlank()) {
                plainPassword = "admin";
                generated = true;
            }

            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setFirstName("Admin");
            admin.setLastName("User");
            admin.setPasswordHash(passwordEncoder.encode(plainPassword));
            admin.setAdmin(true);

            Account account = new Account();
            account.setAccountNumber(UUID.randomUUID().toString());
            account.setUser(admin);
            account.setBalance(new BigDecimal("500.00"));
            admin.setAccount(account);

            userRepository.save(admin);

            if (generated) {
                log.info("Created admin user with email '{}' and generated password: {}", adminEmail, plainPassword);
            } else {
                log.info("Created admin user with email '{}'", adminEmail);
            }
        } else {
            log.info("Admin user with email '{}' already exists.", adminEmail);
        }

        if (userRepository.findByEmail("rodzic1@example.com").isPresent()) {
            log.info("Test data already exists, skipping test data seeding.");
            return;
        }

        log.info("Seeding test data...");

        List<SchoolClass> classes = new ArrayList<>();
        for (int i = 1; i <= 2; i++) {
            User treasurer = new User();
            treasurer.setEmail("skarbnik" + i + "@example.com");
            treasurer.setFirstName("Skarbnik" + i);
            treasurer.setLastName("Skarbnikowski");
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

        int childCounter = 1;
        for (int i = 1; i <= 2; i++) {
            User parent = new User();
            parent.setEmail("rodzic" + i + "@example.com");
            parent.setFirstName("Rodzic" + i);
            parent.setLastName("Rodzicielski");
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

        log.info("Flushing and clearing entity manager before creating fundraiser...");
        entityManager.flush();
        entityManager.clear();
        
        SchoolClass class1 = schoolClassRepository.findById(classes.get(0).getId()).orElseThrow();
        log.info("Found class '{}' with {} members.", class1.getLabel(), class1.getMemberships().size());
        
        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle("Zbiórka na wycieczkę");
        fundraiser.setDescription("Zbiórka na wycieczkę do Warszawy");
        fundraiser.setFundraiserType(FundraiserType.TOTAL_GOAL);
        fundraiser.setGoalAmount(new BigDecimal("600.00"));
        fundraiser.setSchoolClass(class1);
        fundraiser.setStartedAt(LocalDate.now());

        Account fundraiserAccount = new Account();
        fundraiserAccount.setAccountNumber(UUID.randomUUID().toString());
        fundraiserAccount.setFundraiser(fundraiser);
        fundraiser.setAccount(fundraiserAccount);

        fundraiserRepository.save(fundraiser);

        log.info("Creating fundraiser participants for fundraiser '{}'...", fundraiser.getTitle());
        class1.getMemberships().stream()
            .filter(m -> m.getLeftAt() == null)
            .forEach(membership -> {
                log.info("Adding child '{}' to fundraiser.", membership.getChild().getName());
                FundraiserParticipant participant = new FundraiserParticipant();
                participant.setFundraiser(fundraiser);
                participant.setChild(membership.getChild());
                participant.setAddedAt(LocalDate.now());
                fundraiserParticipantRepository.save(participant);
            });

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
