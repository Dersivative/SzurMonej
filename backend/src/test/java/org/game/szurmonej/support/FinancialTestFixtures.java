package org.game.szurmonej.support;

import org.game.szurmonej.entity.*;
import org.game.szurmonej.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class FinancialTestFixtures {

    public record FinancialScenario(
            User treasurer,
            User parent1,
            User parent2,
            Child treasurerChild,
            Child child1,
            Child child2,
            SchoolClass schoolClass,
            Fundraiser fundraiser,
            FundraiserParticipant participant1,
            FundraiserParticipant participant2,
            FundraiserParticipant participant3,
            Account treasurerAccount,
            Account parent1Account,
            Account parent2Account,
            Account fundraiserAccount
    ) {}

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
        User treasurer = new User();
        treasurer.setEmail("skarbnik1@example.com");
        treasurer.setFirstName("Jan");
        treasurer.setLastName("Kowalski");
        treasurer.setPasswordHash(passwordEncoder.encode("skarbnik"));
        treasurer.setAdmin(false);
        treasurer.setEnabled(true);
        treasurer.setChildren(new HashSet<>());
        userRepository.save(treasurer);

        User parent1 = new User();
        parent1.setEmail("rodzic1@example.com");
        parent1.setFirstName("Anna");
        parent1.setLastName("Nowak");
        parent1.setPasswordHash(passwordEncoder.encode("rodzic"));
        parent1.setAdmin(false);
        parent1.setEnabled(true);
        parent1.setChildren(new HashSet<>());
        userRepository.save(parent1);

        User parent2 = new User();
        parent2.setEmail("rodzic2@example.com");
        parent2.setFirstName("Piotr");
        parent2.setLastName("Zieliński");
        parent2.setPasswordHash(passwordEncoder.encode("rodzic"));
        parent2.setAdmin(false);
        parent2.setEnabled(true);
        parent2.setChildren(new HashSet<>());
        userRepository.save(parent2);

        Child treasurerChild = new Child();
        treasurerChild.setName("Krzysztof");
        treasurerChild.setSurname("Kowalski");
        treasurerChild.setParents(Set.of(treasurer));
        childRepository.save(treasurerChild);
        treasurer.getChildren().add(treasurerChild);
        userRepository.save(treasurer);

        Child child1 = new Child();
        child1.setName("Zofia");
        child1.setSurname("Nowak");
        child1.setParents(Set.of(parent1));
        childRepository.save(child1);
        parent1.getChildren().add(child1);
        userRepository.save(parent1);

        Child child2 = new Child();
        child2.setName("Marek");
        child2.setSurname("Zieliński");
        child2.setParents(Set.of(parent2));
        childRepository.save(child2);
        parent2.getChildren().add(child2);
        userRepository.save(parent2);

        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setLabel("Klasa 1A");
        schoolClass.setTreasurer(treasurer);
        schoolClassRepository.save(schoolClass);

        ClassMembership membership1 = new ClassMembership();
        membership1.setChild(treasurerChild);
        membership1.setSchoolClass(schoolClass);
        membership1.setJoinedAt(LocalDate.now());
        classMembershipRepository.save(membership1);

        ClassMembership membership2 = new ClassMembership();
        membership2.setChild(child1);
        membership2.setSchoolClass(schoolClass);
        membership2.setJoinedAt(LocalDate.now());
        classMembershipRepository.save(membership2);

        ClassMembership membership3 = new ClassMembership();
        membership3.setChild(child2);
        membership3.setSchoolClass(schoolClass);
        membership3.setJoinedAt(LocalDate.now());
        classMembershipRepository.save(membership3);

        Fundraiser fundraiser = new Fundraiser();
        fundraiser.setTitle("Zbiórka na wycieczkę");
        fundraiser.setFundraiserType(FundraiserType.PER_CHILD_GOAL);
        fundraiser.setPerChildAmount(new BigDecimal("400.00"));
        fundraiser.setGoalAmount(new BigDecimal("1200.00"));
        fundraiser.setSchoolClass(schoolClass);
        fundraiser.setStartedAt(LocalDate.now());

        Account fundraiserAccount = new Account();
        fundraiserAccount.setAccountNumber(UUID.randomUUID().toString());
        fundraiserAccount.setFundraiser(fundraiser);
        fundraiser.setAccount(fundraiserAccount);

        fundraiserRepository.save(fundraiser);

        FundraiserParticipant p1 = new FundraiserParticipant();
        p1.setFundraiser(fundraiser);
        p1.setChild(treasurerChild);
        p1.setAddedAt(LocalDate.now());
        participantRepository.save(p1);

        FundraiserParticipant p2 = new FundraiserParticipant();
        p2.setFundraiser(fundraiser);
        p2.setChild(child1);
        p2.setAddedAt(LocalDate.now());
        participantRepository.save(p2);

        FundraiserParticipant p3 = new FundraiserParticipant();
        p3.setFundraiser(fundraiser);
        p3.setChild(child2);
        p3.setAddedAt(LocalDate.now());
        participantRepository.save(p3);

        Account treasurerAccount = new Account();
        treasurerAccount.setAccountNumber(UUID.randomUUID().toString());
        treasurerAccount.setUser(treasurer);
        treasurerAccount.setBalance(new BigDecimal("1000.00"));
        accountRepository.save(treasurerAccount);

        Account parent1Account = new Account();
        parent1Account.setAccountNumber(UUID.randomUUID().toString());
        parent1Account.setUser(parent1);
        parent1Account.setBalance(new BigDecimal("1000.00"));
        accountRepository.save(parent1Account);

        Account parent2Account = new Account();
        parent2Account.setAccountNumber(UUID.randomUUID().toString());
        parent2Account.setUser(parent2);
        parent2Account.setBalance(new BigDecimal("1000.00"));
        accountRepository.save(parent2Account);

        return new FinancialScenario(
                treasurer, parent1, parent2,
                treasurerChild, child1, child2,
                schoolClass, fundraiser,
                p1, p2, p3,
                treasurerAccount, parent1Account, parent2Account, fundraiserAccount
        );
    }
}
