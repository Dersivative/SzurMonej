package org.game.szurmonej.support;

import org.game.szurmonej.entity.*;
import org.game.szurmonej.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class FinancialTestFixtures {

    private FinancialTestFixtures() {
    }

    public record FinancialScenario(
            User parent,
            User otherParent,
            User treasurer,
            Child child,
            Child otherChild,
            SchoolClass schoolClass,
            Fundraiser fundraiser,
            FundraiserParticipant participant
    ) {
    }

    public static FinancialScenario seed(
            UserRepository userRepository,
            ChildRepository childRepository,
            SchoolClassRepository schoolClassRepository,
            FundraiserRepository fundraiserRepository,
            FundraiserParticipantRepository participantRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            ClassMembershipRepository classMembershipRepository
    ) {
        // Create Users
        User parent = saveUser(userRepository, passwordEncoder, "rodzic1@example.com", "pass123", "Rodzic", "Jeden");
        User otherParent = saveUser(userRepository, passwordEncoder, "rodzic2@example.com", "pass123", "Rodzic", "Dwa");
        User treasurer = saveUser(userRepository, passwordEncoder, "skarbnik@example.com", "pass123", "Skarbnik", "Klasowy");

        // Create Accounts with sufficient funds
        createUserAccount(accountRepository, parent, new BigDecimal("500.00"));
        createUserAccount(accountRepository, otherParent, new BigDecimal("500.00"));
        createUserAccount(accountRepository, treasurer, new BigDecimal("500.00"));

        // Create Children and link to parents
        Child child = saveChild(childRepository, userRepository, "Adam", "Kowalski", parent);
        Child otherChild = saveChild(childRepository, userRepository, "Ewa", "Nowak", otherParent);
        Child treasurerChild = saveChild(childRepository, userRepository, "Krzysztof", "Skarbnikowski", treasurer);

        // Create School Class and link treasurer
        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setLabel("3A");
        schoolClass.setTreasurer(treasurer);
        schoolClass = schoolClassRepository.save(schoolClass);

        // Create Memberships
        createMembership(classMembershipRepository, schoolClass, child);
        createMembership(classMembershipRepository, schoolClass, otherChild);
        createMembership(classMembershipRepository, schoolClass, treasurerChild);

        // Create Fundraiser
        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle("Wycieczka");
        fundraiser.setSchoolClass(schoolClass);
        fundraiser.setGoalAmount(new BigDecimal("600.00"));
        fundraiser.setStartedAt(LocalDate.now());
        
        Account fundraiserAccount = new Account();
        fundraiserAccount.setAccountNumber(UUID.randomUUID().toString());
        fundraiserAccount.setFundraiser(fundraiser);
        fundraiserAccount.setBalance(BigDecimal.ZERO);
        fundraiser.setAccount(fundraiserAccount);
        fundraiser = fundraiserRepository.save(fundraiser);
        
        // Create Participants
        FundraiserParticipant participant1 = createFundraiserParticipant(participantRepository, fundraiser, child);
        createFundraiserParticipant(participantRepository, fundraiser, otherChild);
        createFundraiserParticipant(participantRepository, fundraiser, treasurerChild);

        return new FinancialScenario(parent, otherParent, treasurer, child, otherChild, schoolClass, fundraiser, participant1);
    }

    private static Child saveChild(ChildRepository repository, UserRepository userRepository, String name, String surname, User parent) {
        Child child = new Child();
        child.setName(name);
        child.setSurname(surname);
        child.setDateOfBirth(LocalDate.of(2015, 1, 1));
        Child savedChild = repository.save(child);

        savedChild.setParents(new HashSet<>(Set.of(parent)));
        parent.setChildren(new HashSet<>(Set.of(savedChild)));
        userRepository.save(parent);
        return savedChild;
    }

    private static User saveUser(
            UserRepository repository,
            PasswordEncoder passwordEncoder,
            String email,
            String rawPassword,
            String firstName,
            String lastName
    ) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setAdmin(false);
        return repository.save(user);
    }

    private static void createUserAccount(AccountRepository repository, User user, BigDecimal balance) {
        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setUser(user);
        account.setBalance(balance);
        repository.save(account);
    }

    private static void createMembership(ClassMembershipRepository repository, SchoolClass schoolClass, Child child) {
        ClassMembership membership = new ClassMembership();
        membership.setSchoolClass(schoolClass);
        membership.setChild(child);
        membership.setJoinedAt(LocalDate.now());
        repository.save(membership);
    }

    private static FundraiserParticipant createFundraiserParticipant(FundraiserParticipantRepository repository, Fundraiser fundraiser, Child child) {
        FundraiserParticipant participant = new FundraiserParticipant();
        participant.setFundraiser(fundraiser);
        participant.setChild(child);
        participant.setAddedAt(LocalDate.now());
        return repository.save(participant);
    }
}
