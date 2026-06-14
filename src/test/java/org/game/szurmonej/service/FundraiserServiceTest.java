package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
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
    private AccountService accountService;

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
                .isInstanceOf(ForbiddenOperationException.class);
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
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void getFundraisersForChild_throwsWhenUserIsNotParentOfTheChild() {
        loginAs(scenario.otherParent()); 
        assertThatThrownBy(() -> fundraiserService.getFundraisersForChild(scenario.child().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void getFundraiserDetails_throwsWhenUserIsNotParticipantParent() {
        loginAs(scenario.otherParent());
        assertThatThrownBy(() -> fundraiserService.getFundraiserDetails(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    // --- Fundraiser Lifecycle and Edge Case Tests ---

    @Test
    void updateGoal_toLowerValue_withInsufficientFunds_performsPartialRefund() {
        // 1. Setup: 3 participants, goal is 600. Two parents pay 200 each.
        loginAs(scenario.parent());
        TransferToFundraiserRequest request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child().getId());
        request1.setAmount(new BigDecimal("200.00"));
        accountService.transferToFundraiser(request1);
        
        loginAs(scenario.otherParent());
        TransferToFundraiserRequest request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.otherChild().getId());
        request2.setAmount(new BigDecimal("200.00"));
        accountService.transferToFundraiser(request2);
        
        // 2. Treasurer withdraws 380, leaving 20 in the fundraiser account.
        loginAs(scenario.treasurer());
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("380.00"), "Withdrawal");
        
        // 3. Treasurer decreases goal to 400. New cost per child is ~133.33.
        // Overpayment per paying parent is ~66.67. Total refund needed is ~133.34.
        // Fundraiser account only has 20.
        fundraiserService.updateGoal(scenario.fundraiser().getId(), new BigDecimal("400.00"));

        // 4. Verification
        var fundraiserAccount = accountRepository.findByFundraiser_Id(scenario.fundraiser().getId()).orElseThrow();
        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00"); // Balance should be drained

        var parent1Account = accountRepository.findByUser_Id(scenario.parent().getId()).orElseThrow();
        var parent2Account = accountRepository.findByUser_Id(scenario.otherParent().getId()).orElseThrow();
        
        // The 20 PLN should be split between the two overpaying parents
        assertThat(parent1Account.getBalance()).isEqualByComparingTo("10.00"); // Initial 0 + 10 refund
        assertThat(parent2Account.getBalance()).isEqualByComparingTo("10.00"); // Initial 0 + 10 refund

        var participant1 = participantRepository.findByFundraiser_IdAndChild_Id(scenario.fundraiser().getId(), scenario.child().getId()).orElseThrow();
        var participant2 = participantRepository.findByFundraiser_IdAndChild_Id(scenario.fundraiser().getId(), scenario.otherChild().getId()).orElseThrow();
        
        // Verify remaining credit
        assertThat(participant1.getCredit()).isEqualByComparingTo("56.67"); // 66.67 - 10 refund
        assertThat(participant2.getCredit()).isEqualByComparingTo("56.67"); // 66.67 - 10 refund
    }

    @Test
    void withdrawAll_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent());
        assertThatThrownBy(() -> fundraiserService.withdrawAll(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void withdrawAll_throwsWhenFundraiserIsNotActive() {
        loginAs(scenario.treasurer());
        Fundraiser f = scenario.fundraiser();
        f.setStatus(FundraiserStatus.FINISHED);
        fundraiserRepository.save(f);

        assertThatThrownBy(() -> fundraiserService.withdrawAll(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class);
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
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void settleFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent());
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void settleFundraiser_throwsWhenFundraiserIsNotReconciling() {
        loginAs(scenario.treasurer());
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void settleFundraiser_throwsWhenDebtsAreNotPaid() {
        loginAs(scenario.treasurer());
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");
        
        var participant = scenario.participant();
        participant.setDebt(new BigDecimal("10.00"));
        participantRepository.save(participant);

        assertThatThrownBy(() -> fundraiserService.settleFundraiser(scenario.fundraiser().getId()))
                .isInstanceOf(ResponseStatusException.class);
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
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void payDebt_throwsWhenParticipantHasNoDebt() {
        loginAs(scenario.treasurer());
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Reconciliation");
        
        var participant = participantRepository.findById(scenario.participant().getId()).orElseThrow();
        participant.setDebt(BigDecimal.ZERO);
        participantRepository.save(participant);

        loginAs(scenario.parent());
        
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    private void loginAs(User user) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
