package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserStatus;
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
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

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
        userRepository.deleteAll();
        childRepository.deleteAll();
        schoolClassRepository.deleteAll();
        fundraiserRepository.deleteAll();
        
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

    // --- Fundraiser Creation Tests ---

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
        loginAs(scenario.parent());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Unauthorized Fundraiser");
        request.setGoalAmount(new BigDecimal("100.00"));

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Tylko skarbnik");
    }

    @Test
    void createFundraiser_inEmptyClass_succeedsAndReturnsCorrectData() {
        loginAs(scenario.treasurer());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Empty Class Fundraiser");
        request.setGoalAmount(new BigDecimal("100.00"));
        
        var emptyClass = new org.game.szurmonej.entity.SchoolClass();
        emptyClass.setLabel("Empty Class");
        emptyClass.setTreasurer(scenario.treasurer());
        schoolClassRepository.save(emptyClass);

        FundraiserResponse response = fundraiserService.createFundraiser(request, emptyClass.getId());

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Empty Class Fundraiser");
        assertThat(response.getGoalAmount()).isEqualByComparingTo("100.00");
        assertThat(response.getParticipants()).isEmpty();
        assertThat(fundraiserRepository.findById(response.getId())).isPresent();
    }

    // --- Visibility and Authorization Tests ---

    @Test
    void getFundraisersForClass_throwsWhenUserIsNotTreasurerAndNotAdmin() {
        loginAs(scenario.parent()); // Regular parent
        assertThatThrownBy(() -> fundraiserService.getFundraisersForClass(scenario.schoolClass().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Nie masz uprawnień do przeglądania zbiórek tej klasy");
    }

    @Test
    void getFundraisersForChild_throwsWhenUserIsNotParentOfTheChild() {
        // Malicious parent tries to view another parent's child's fundraisers
        loginAs(scenario.otherParent()); 
        assertThatThrownBy(() -> fundraiserService.getFundraisersForChild(scenario.child().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Nie masz uprawnień do tego dziecka");
    }

    @Test
    void getFundraiserDetails_throwsWhenUserIsNotParticipantParent() {
        loginAs(scenario.otherParent());
        assertThatThrownBy(() -> fundraiserService.getFundraiserDetails(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Nie masz uprawnień do przeglądania tej zbiórki");
    }

    // --- Fundraiser Withdrawal and Lifecycle Tests ---

    @Test
    void withdrawAll_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent());
        assertThatThrownBy(() -> fundraiserService.withdrawAll(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void withdrawAll_throwsWhenFundraiserIsNotActive() {
        loginAs(scenario.treasurer());
        // Force the fundraiser into a non-active state
        Fundraiser f = scenario.fundraiser();
        f.setStatus(FundraiserStatus.FINISHED);
        fundraiserRepository.save(f);

        assertThatThrownBy(() -> fundraiserService.withdrawAll(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Zbiórka nie jest aktywna");
    }

    @Test
    void reconcileFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent());
        assertThatThrownBy(() -> fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Unauthorized"))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void reconcileFundraiser_throwsIfAlreadyReconcilingOrFinished() {
        loginAs(scenario.treasurer());
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "First time");
        
        assertThatThrownBy(() -> fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Second time"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Zbiórka nie jest aktywna");
    }

    @Test
    void reconcileFundraiser_withZeroSpent_closesFundraiserWithNoDebtsOrCredits() {
        loginAs(scenario.treasurer());
        
        // No withdrawals were made. Reconciling directly.
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");

        var participant = participantRepository.findById(scenario.participant().getId()).orElseThrow();
        
        // Debt and credit should be zero or null because no money was spent
        assertThat(participant.getDebt() == null || participant.getDebt().compareTo(BigDecimal.ZERO) == 0).isTrue();
        assertThat(participant.getCredit() == null || participant.getCredit().compareTo(BigDecimal.ZERO) == 0).isTrue();
        
        var fundraiser = fundraiserRepository.findById(scenario.fundraiser().getId()).orElseThrow();
        assertThat(fundraiser.getGoalAmount()).isEqualByComparingTo("0.00");
    }

    // --- Settlement and Debt Tests ---

    @Test
    void settleFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent());
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void settleFundraiser_throwsWhenFundraiserIsNotReconciling() {
        loginAs(scenario.treasurer());
        // Attempt to settle while ACTIVE
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Zbiórka nie jest w trakcie rozliczania");
    }

    @Test
    void settleFundraiser_throwsWhenDebtsAreNotPaid() {
        loginAs(scenario.treasurer());
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");
        
        // We simulate a situation where debt remains. Since we didn't inject contributions, 
        // the reconciliation calculation might assign debts depending on the spent amount.
        // Even if debt is 0, let's explicitly inject a debt to test the guard logic:
        var participant = scenario.participant();
        participant.setDebt(new BigDecimal("10.00"));
        participantRepository.save(participant);

        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Nie wszyscy uczestnicy spłacili swoje długi");
    }
    
    @Test
    void payDebt_throwsWhenUserIsNotParentOfTheChild() {
        loginAs(scenario.otherParent());
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void payDebt_throwsWhenFundraiserIsNotReconciling() {
        loginAs(scenario.parent());
        // Fundraiser is still ACTIVE. A malicious parent tries to force pay debt.
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Zbiórka nie jest w trakcie rozliczania");
    }

    @Test
    void payDebt_throwsWhenParticipantHasNoDebt() {
        loginAs(scenario.treasurer());
        // Move to reconciling state
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");
        
        // Ensure the participant has exactly ZERO debt for the test context
        var participant = participantRepository.findById(scenario.participant().getId()).orElseThrow();
        participant.setDebt(BigDecimal.ZERO);
        participantRepository.save(participant);

        // Switch to parent and attempt to pay the non-existent debt
        loginAs(scenario.parent());
        
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Uczestnik nie ma żadnego długu do spłacenia");
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
