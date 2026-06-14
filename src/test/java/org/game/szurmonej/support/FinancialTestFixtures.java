package org.game.szurmonej.support;

import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.FundraiserRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
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
            PasswordEncoder passwordEncoder
    ) {
        Child child = saveChild(childRepository, "Adam", "Kowalski");
        Child otherChild = saveChild(childRepository, "Ewa", "Nowak");

        User parent = saveUser(userRepository, passwordEncoder, "rodzic1@example.com", "pass123", "Rodzic", "Jeden");
        User otherParent = saveUser(userRepository, passwordEncoder, "rodzic2@example.com", "pass123", "Rodzic", "Dwa");
        User treasurer = saveUser(userRepository, passwordEncoder, "skarbnik@example.com", "pass123", "Skarbnik", "Klasowy");

        createUserAccount(accountRepository, parent, new BigDecimal("100.00"));
        createUserAccount(accountRepository, otherParent, BigDecimal.ZERO);
        createUserAccount(accountRepository, treasurer, BigDecimal.ZERO);

        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setLabel("3A");
        schoolClass.setTreasurer(treasurer);
        schoolClass = schoolClassRepository.save(schoolClass);

        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle("Wycieczka");
        fundraiser.setSchoolClass(schoolClass);
        fundraiser.setStartedAt(LocalDate.now());
        fundraiser = fundraiserRepository.save(fundraiser);

        Account fundraiserAccount = new Account();
        fundraiserAccount.setAccountNumber(UUID.randomUUID().toString());
        fundraiserAccount.setFundraiser(fundraiser);
        fundraiserAccount.setBalance(BigDecimal.ZERO);
        accountRepository.save(fundraiserAccount);
        fundraiser.setAccount(fundraiserAccount);

        FundraiserParticipant participant = new FundraiserParticipant();
        participant.setFundraiser(fundraiser);
        participant.setChild(child);
        participant.setAddedAt(LocalDate.now());
        participant = participantRepository.save(participant);

        return new FinancialScenario(parent, otherParent, treasurer, child, otherChild, schoolClass, fundraiser, participant);
    }

    private static Child saveChild(ChildRepository repository, String name, String surname) {
        Child child = new Child();
        child.setName(name);
        child.setSurname(surname);
        child.setDateOfBirth(LocalDate.of(2015, 1, 1));
        return repository.save(child);
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
}
