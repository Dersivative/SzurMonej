package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.*;
import org.game.szurmonej.support.FinancialTestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class FundraiserServiceTest {

    @Autowired
    private FundraiserService fundraiserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChildRepository childRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @Autowired
    private FundraiserRepository fundraiserRepository;

    @Autowired
    private FundraiserParticipantRepository participantRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private FinancialTestFixtures.FinancialScenario scenario;

    @BeforeEach
    void setUp() {
        // Clear all related repositories before each test
        userRepository.deleteAll();
        childRepository.deleteAll();
        schoolClassRepository.deleteAll();
        fundraiserRepository.deleteAll();
        
        // Seed the database with a consistent state
        scenario = FinancialTestFixtures.seed(
                userRepository,
                childRepository,
                schoolClassRepository,
                fundraiserRepository,
                participantRepository,
                accountRepository,
                passwordEncoder
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createFundraiser_throwsWhenGoalIsZero() {
        loginAs(scenario.treasurer());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Test Fundraiser");
        request.setGoalAmount(BigDecimal.ZERO);

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Kwota docelowa musi być większa od zera.");
    }

    @Test
    void createFundraiser_throwsWhenGoalIsNegative() {
        loginAs(scenario.treasurer());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Test Fundraiser");
        request.setGoalAmount(new BigDecimal("-100.00"));

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Kwota docelowa musi być większa od zera.");
    }

    @Test
    void createFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent()); // Log in as a regular parent
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Unauthorized Fundraiser");
        request.setGoalAmount(new BigDecimal("100.00"));

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Tylko skarbnik tej klasy może tworzyć dla niej zbiórki.");
    }

    @Test
    void reconcileFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent()); // Log in as a regular parent

        assertThatThrownBy(() -> fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Unauthorized reconciliation"))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Tylko skarbnik tej klasy może zakończyć zbiórkę.");
    }

    @Test
    void settleFundraiser_throwsWhenDebtsAreNotPaid() {
        loginAs(scenario.treasurer());
        
        // First, reconcile the fundraiser to create debts/credits
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");

        // Attempt to settle immediately, which should fail
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Nie wszyscy uczestnicy spłacili swoje długi.");
    }
    
    @Test
    void payDebt_throwsWhenUserIsNotParentOfTheChild() {
        loginAs(scenario.otherParent()); // Log in as a different parent

        // Reconcile to create a debt for the first child
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");

        // The "other parent" tries to pay the debt for a child that is not theirs
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Nie masz uprawnień do spłaty długu dla tego dziecka.");
    }

    private void loginAs(User user) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getUsername(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
