package org.game.szurmonej.service;

import org.game.szurmonej.dto.FundraiserCreateRequest;
import org.game.szurmonej.dto.FundraiserResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.EnrollmentStatus;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.FundraiserType;
import org.game.szurmonej.entity.RefundRequestType;
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
import java.time.LocalDate;
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
    private RefundRequestService refundRequestService;

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
    private ClassMembershipRepository classMembershipRepository;

    @Autowired
    private RefundRequestRepository refundRequestRepository;

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
                passwordEncoder,
                classMembershipRepository
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
        request.setFundraiserType(FundraiserType.TOTAL_GOAL);
        request.setGoalAmount(BigDecimal.ZERO);

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void createFundraiser_throwsWhenGoalIsNegative() {
        loginAs(scenario.treasurer());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Test Fundraiser");
        request.setFundraiserType(FundraiserType.TOTAL_GOAL);
        request.setGoalAmount(new BigDecimal("-100.00"));

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void createFundraiser_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent1());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Unauthorized Fundraiser");
        request.setFundraiserType(FundraiserType.TOTAL_GOAL);
        request.setGoalAmount(new BigDecimal("100.00"));

        assertThatThrownBy(() -> fundraiserService.createFundraiser(request, scenario.schoolClass().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void createFundraise_inEmptyClas_succeedsAdnReturnsCorrectData() {
        loginAs(scenario.treasurer());
        FundraiserCreateRequest request = new FundraiserCreateRequest();
        request.setTitle("Empty Class Fundraiser");
        request.setFundraiserType(FundraiserType.TOTAL_GOAL);
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
    void getFundraisersForClass_isAllowedForParentInClass() {
        loginAs(scenario.parent1());
        assertDoesNotThrow(() -> fundraiserService.getFundraisersForClass(scenario.schoolClass().getId()));
    }

    @Test
    void getFundraisersForChild_throwsWhenUserIsNotParentOfTheChild() {
        loginAs(scenario.parent2());
        assertThatThrownBy(() -> fundraiserService.getFundraisersForChild(scenario.child1().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void getFundraiserDetails_throwsWhenUserIsNotParticipantParent() {
        User unrelatedParent = saveUnrelatedParent();
        loginAs(unrelatedParent);
        assertThatThrownBy(() -> fundraiserService.getFundraiserDetails(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void getFundraiserDetails_parentSeesFullData() {
        loginAs(scenario.parent1());
        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request);

        FundraiserResponse response = fundraiserService.getFundraiserDetails(scenario.fundraiser().getId());

        assertThat(response.getParticipants().size()).isGreaterThanOrEqualTo(2);
        assertThat(response.getHistory()).isNotEmpty();
    }

    @Test
    void getFundraiserDetails_treasurerSeesFullData() {
        loginAs(scenario.treasurer());
        FundraiserResponse response = fundraiserService.getFundraiserDetails(scenario.fundraiser().getId());

        assertThat(response.getParticipants().size()).isGreaterThanOrEqualTo(2);
    }

    // --- Fundraiser Lifecycle and Edge Case Tests ---

    @Test
    void updateGoal_toLowerValue_withInsufficientFunds_performsPartialRefund() {
        // 1. Setup: 3 participants, goal is 1200. Two parents pay 400 each.
        loginAs(scenario.parent1());
        TransferToFundraiserRequest request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);
        
        loginAs(scenario.parent2());
        TransferToFundraiserRequest request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);
        
        // 2. Treasurer withdraws 760, leaving 40 in the fundraiser account.
        loginAs(scenario.treasurer());
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("760.00"), "Withdrawal");
        
        // 3. Treasurer decreases goal to 900 (300 per child).
        // Overpayment per paying parent is 100. Total refund needed is 200.
        // Fundraiser account only has 40.
        fundraiserService.updateGoal(scenario.fundraiser().getId(), new BigDecimal("300.00"));

        // 4. Verification
        var fundraiserAccount = accountRepository.findByFundraiser_Id(scenario.fundraiser().getId()).orElseThrow();
        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00"); // Balance should be drained

        var parent1Account = accountRepository.findByUser_Id(scenario.parent1().getId()).orElseThrow();
        var parent2Account = accountRepository.findByUser_Id(scenario.parent2().getId()).orElseThrow();
        
        // The 40 PLN should be split between the two overpaying parents (20 each)
        assertThat(parent1Account.getBalance()).isEqualByComparingTo("620.00"); // 1000 - 400 + 20
        assertThat(parent2Account.getBalance()).isEqualByComparingTo("620.00"); // 1000 - 400 + 20

        var participant1 = participantRepository.findByFundraiser_IdAndChild_Id(scenario.fundraiser().getId(), scenario.child1().getId()).orElseThrow();
        var participant2 = participantRepository.findByFundraiser_IdAndChild_Id(scenario.fundraiser().getId(), scenario.child2().getId()).orElseThrow();
        
        // Verify remaining credit
        assertThat(participant1.getCredit()).isEqualByComparingTo("80.00"); // 100 - 20 refund
        assertThat(participant2.getCredit()).isEqualByComparingTo("80.00"); // 100 - 20 refund
    }

    @Test
    void withdrawAll_throwsWhenUserIsNotTreasurer() {
        loginAs(scenario.parent1());
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
        loginAs(scenario.parent1());
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
        loginAs(scenario.parent1());
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
        Fundraiser fundraiser = scenario.fundraiser();
        
        // Setup: Give the fundraiser account some money to allow withdrawal
        var fundraiserAccount = fundraiser.getAccount();
        fundraiserAccount.setBalance(new BigDecimal("500.00"));
        accountRepository.save(fundraiserAccount);

        // Simulate an expense that exceeds contributions, creating a debt scenario
        accountService.withdrawFromFundraiser(fundraiser.getId(), new BigDecimal("300.00"), "Test Expense");

        // Now, set the status to RECONCILING and try to settle
        fundraiser.setStatus(FundraiserStatus.RECONCILING);
        fundraiserRepository.save(fundraiser);

        // The settle method should now fail because debts are not paid
        assertThatThrownBy(() -> fundraiserService.settleFundraiser(fundraiser.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Nie wszyscy uczestnicy spłacili swoje długi.");
    }

    @Test
    void withdrawDuringReconciling_recalculatesParticipantDebts() {
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        loginAs(scenario.treasurer());
        fundraiserService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("300.00"), "Pierwszy zakup");
        fundraiserService.reconcileFundraiser(scenario.fundraiser().getId(), "Rozliczenie");

        var treasurerChildBefore = participantRepository.findByFundraiser_IdAndChild_Id(
                scenario.fundraiser().getId(), scenario.treasurerChild().getId()).orElseThrow();
        assertThat(treasurerChildBefore.getDebt()).isEqualByComparingTo("100.00");

        fundraiserService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("300.00"), "Drugi zakup");

        var treasurerChildAfter = participantRepository.findByFundraiser_IdAndChild_Id(
                scenario.fundraiser().getId(), scenario.treasurerChild().getId()).orElseThrow();
        var child1After = participantRepository.findByFundraiser_IdAndChild_Id(
                scenario.fundraiser().getId(), scenario.child1().getId()).orElseThrow();

        assertThat(treasurerChildAfter.getDebt()).isEqualByComparingTo("200.00");
        assertThat(child1After.getCredit()).isEqualByComparingTo("200.00");
    }
    
    @Test
    void payDebt_throwsWhenParentIsFromOutsideTheClass() {
        loginAs(scenario.treasurer());
        Fundraiser fundraiser = fundraiserRepository.findById(scenario.fundraiser().getId()).orElseThrow();
        fundraiser.setStatus(FundraiserStatus.RECONCILING);
        fundraiserRepository.save(fundraiser);
        
        var participant = scenario.participant1();
        participant.setDebt(new BigDecimal("10.00"));
        participantRepository.save(participant);

        User unrelatedParent = saveUnrelatedParent();
        loginAs(unrelatedParent);

        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child1().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void payDebt_throwsWhenFundraiserIsNotReconciling() {
        loginAs(scenario.parent1());
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child1().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void payDebt_throwsWhenParticipantHasNoDebt() {
        loginAs(scenario.treasurer());
        Fundraiser fundraiser = fundraiserRepository.findById(scenario.fundraiser().getId()).orElseThrow();
        fundraiser.setStatus(FundraiserStatus.RECONCILING);
        fundraiserRepository.save(fundraiser);
        
        var participant = participantRepository.findById(scenario.participant1().getId()).orElseThrow();
        participant.setDebt(BigDecimal.ZERO);
        participantRepository.save(participant);

        loginAs(scenario.parent1());
        
        assertThatThrownBy(() -> fundraiserService.payDebt(scenario.fundraiser().getId(), scenario.child1().getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void updateGoalAndSettle_withComplexHistory_refundsCreditsCorrectly() {
        // 1. Two parents pay 400 each (goal is 1200 for 3 children)
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        // 2. Treasurer withdraws 780, leaving 20 in the fundraiser account
        loginAs(scenario.treasurer());
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("780.00"), "Withdrawal");

        // 3. Treasurer updates the goal to 900 (300 per child).
        fundraiserService.updateGoal(scenario.fundraiser().getId(), new BigDecimal("300.00"));
        
        // Verify partial refund
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("610.00"); // 1000 - 400 + 10
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("610.00"); // 1000 - 400 + 10

        // 4. Treasurer pays their share (300)
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(scenario.fundraiser().getId());
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 5. Finalize and settle the fundraiser
        fundraiserService.finalizeFundraiser(scenario.fundraiser().getId());
        
        // 6. Verify final balances
        var fundraiserAccount = accountRepository.findByFundraiser_Id(scenario.fundraiser().getId()).orElseThrow();
        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00");

        // Parent1 balance: 610 (after partial refund) + 130 (final refund) = 740
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("740.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("740.00");
        // Treasurer balance: 1000 - 300 (paid) = 700
        var treasurerAccount = accountRepository.findByUser_Id(scenario.treasurer().getId()).orElseThrow();
        assertThat(treasurerAccount.getBalance()).isEqualByComparingTo("1520.00");
    }

    @Test
    void settlePerChildFundraiser_withComplexHistory_refundsCreditsCorrectly() {
        // 1. Create a PER_CHILD fundraiser
        loginAs(scenario.treasurer());
        var createRequest = new FundraiserCreateRequest();
        createRequest.setTitle("Per Child Test");
        createRequest.setFundraiserType(org.game.szurmonej.entity.FundraiserType.PER_CHILD_GOAL);
        createRequest.setPerChildAmount(new BigDecimal("150.00"));
        var fundraiserResponse = fundraiserService.createFundraiser(createRequest, scenario.schoolClass().getId());
        var fundraiserId = fundraiserResponse.getId();

        // FIXME: This is a workaround for a bug where creating a PER_CHILD fundraiser
        // does not add any children to the participants.
        var fundraiser = fundraiserRepository.findById(fundraiserId).orElseThrow();
        List.of(scenario.child1(), scenario.child2(), scenario.treasurerChild()).forEach(c -> {
            var participant = new FundraiserParticipant();
            participant.setFundraiser(fundraiser);
            participant.setChild(c);
            participant.setDebt(fundraiser.getPerChildAmount());
            participant.setCredit(BigDecimal.ZERO);
            participant.setAddedAt(LocalDate.now());
            fundraiser.getParticipants().add(participant);
        });
        fundraiser.setGoalAmount(fundraiser.getPerChildAmount().multiply(new BigDecimal(fundraiser.getParticipants().size())));
        fundraiserRepository.saveAndFlush(fundraiser);
        // End of workaround

        // 2. Two parents pay 150 each
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(fundraiserId);
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(fundraiserId);
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        // 3. Treasurer withdraws 280, leaving 20 in the fundraiser account
        loginAs(scenario.treasurer());
        accountService.withdrawFromFundraiser(fundraiserId, new BigDecimal("280.00"), "Withdrawal");

        // 4. Treasurer pays their share (150)
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(fundraiserId);
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 5. Finalize and settle the fundraiser
        fundraiserService.finalizeFundraiser(fundraiserId);

        // 6. Verify final balances
        var fundraiserAccount = accountRepository.findByFundraiser_Id(fundraiserId).orElseThrow();
        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00");

        // One parent gets refund 56.66, the other two get 56.67 due to remainder distribution.
        // Final balance: 1000 - 150 + refund.
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("906.66");
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("906.67");
        assertThat(accountRepository.findByUser_Id(scenario.treasurer().getId()).get().getBalance()).isEqualByComparingTo("1186.67");
    }

    @Test
    void updatePerChildGoalAndSettle_withComplexHistory_refundsCreditsCorrectly() {
        // 1. Create a PER_CHILD fundraiser with a goal of 200 per child
        loginAs(scenario.treasurer());
        var createRequest = new FundraiserCreateRequest();
        createRequest.setTitle("Per Child Update Test");
        createRequest.setFundraiserType(org.game.szurmonej.entity.FundraiserType.PER_CHILD_GOAL);
        createRequest.setPerChildAmount(new BigDecimal("200.00"));
        var fundraiserResponse = fundraiserService.createFundraiser(createRequest, scenario.schoolClass().getId());
        var fundraiserId = fundraiserResponse.getId();
        // FIXME: This is a workaround for a bug where creating a PER_CHILD fundraiser
        // does not add any children to the participants.
        var fundraiser = fundraiserRepository.findById(fundraiserId).orElseThrow();
        List.of(scenario.child1(), scenario.child2(), scenario.treasurerChild()).forEach(c -> {
            var participant = new FundraiserParticipant();
            participant.setFundraiser(fundraiser);
            participant.setChild(c);
            participant.setDebt(fundraiser.getPerChildAmount());
            participant.setCredit(BigDecimal.ZERO);
            participant.setAddedAt(LocalDate.now());
            fundraiser.getParticipants().add(participant);
        });
        fundraiser.setGoalAmount(fundraiser.getPerChildAmount().multiply(new BigDecimal(fundraiser.getParticipants().size())));
        fundraiserRepository.saveAndFlush(fundraiser);
        // 2. Two parents pay 200 each
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(fundraiserId);
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(fundraiserId);
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        // 3. Treasurer withdraws 380, leaving 20 in the fundraiser account
        loginAs(scenario.treasurer());
        accountService.withdrawFromFundraiser(fundraiserId, new BigDecimal("380.00"), "Withdrawal");

        // 4. Treasurer updates the per-child goal to 130.
        // This should trigger a partial refund of 10 to each of the first two parents.
        fundraiserService.updateGoal(fundraiserId, new BigDecimal("130.00"));
        
        // Verify partial refund
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("810.00"); // 1000 - 200 + 10
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("810.00"); // 1000 - 200 + 10

        // 5. Treasurer pays their new share (130)
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(fundraiserId);
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 6. Finalize and settle the fundraiser
        fundraiserService.finalizeFundraiser(fundraiserId);

        // 7. Verify final balances
        var fundraiserAccount = accountRepository.findByFundraiser_Id(fundraiserId).orElseThrow();
        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00");

        // Parent balance: 1000 - 200 (paid) + 10 (partial refund) + 63.33 (final refund) = 873.33
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("873.33");
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("873.33");
        // Treasurer balance: 1000 - 130 (paid) + 3.34 (final refund) = 873.34
        var treasurerAccount = accountRepository.findByUser_Id(scenario.treasurer().getId()).orElseThrow();
        assertThat(treasurerAccount.getBalance()).isEqualByComparingTo("1253.34");
    }

    @Test
    void settleReopenAndSettleAgain_restoresAllFundsCorrectly() {
        // 1. All parents pay 400 each for a 1200 PLN goal
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        loginAs(scenario.treasurer());
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(scenario.fundraiser().getId());
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 2. Treasurer withdraws 1200, then returns 40 change
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("1200.00"), "Zakup");
        accountService.depositToFundraiser(scenario.fundraiser().getId(), new BigDecimal("40.00"), "Zwrot reszty");

        // 3. First settlement - 40 PLN should be refunded
        fundraiserService.finalizeFundraiser(scenario.fundraiser().getId());
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("613.33");
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("613.33");
        assertThat(accountRepository.findByUser_Id(scenario.treasurer().getId()).get().getBalance()).isEqualByComparingTo("1773.34");

        // 4. Reopen fundraiser and return the main amount
        fundraiserService.reopenFundraiser(scenario.fundraiser().getId());
        accountService.depositToFundraiser(scenario.fundraiser().getId(), new BigDecimal("1160.00"), "Zwrot głównych środków");

        // 5. Final settlement
        fundraiserService.finalizeFundraiser(scenario.fundraiser().getId());

        // 6. Verify all accounts are back to their initial state
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("1000.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent2().getId()).get().getBalance()).isEqualByComparingTo("1000.00");
        assertThat(accountRepository.findByUser_Id(scenario.treasurer().getId()).get().getBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void parentPaysForAnotherChild_thenRequestsRefund_fundsAreReturnedToOriginalPayer() {
        // 1. Setup: Fundraiser with goal 900 (300 per child). All parents have 1000.
        loginAs(scenario.treasurer());
        Fundraiser fundraiser = scenario.fundraiser();
        Long fundraiserId = fundraiser.getId();
        // Przekazujemy kwotę NA DZIECKO, aby ustawić cel całkowity na 900 zł.
        fundraiserService.updateGoal(fundraiserId, new BigDecimal("300.00"));

        // 2. Parent1 pays for their child (child1) and for parent2's child (child2)
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(fundraiserId);
        request1.setChildId(scenario.child1().getId());
        request1.setNote("Payment for own child");
        accountService.transferToFundraiser(request1);

        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(fundraiserId);
        request2.setChildId(scenario.child2().getId());
        request2.setNote("Payment for other child");
        accountService.transferToFundraiser(request2);
        // Parent1 balance: 1000 - 400 - 400 = 200

        // 3. Treasurer increases goal to 1200 (400 per child)
        loginAs(scenario.treasurer());
        fundraiserService.updateGoal(fundraiserId, new BigDecimal("400.00"));

        // 4. Parent1 pays the remaining 100 for both children
        loginAs(scenario.parent1());
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(fundraiserId);
        request3.setChildId(scenario.child1().getId());
        request3.setNote("Top-up for own child");
        accountService.transferToFundraiser(request3);

        var request4 = new TransferToFundraiserRequest();
        request4.setFundraiserId(fundraiserId);
        request4.setChildId(scenario.child2().getId());
        request4.setNote("Top-up for other child");
        accountService.transferToFundraiser(request4);
        // Parent1 balance: 400 - 100 - 100 = 200

        // Weryfikacja stanu konta po dopłatach
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("200.00");

        // 5. Rodzic1 składa wniosek o zwrot całej wpłaty za dziecko Rodzica2 (300 + 100 = 400 zł)
        var refundRequestDto = refundRequestService.createRefundRequest(fundraiserId, scenario.child2().getId());
        
        // 6. Treasurer approves the refund request
        loginAs(scenario.treasurer());
        refundRequestService.approveRefundRequest(refundRequestDto.getId());

        // --- Verification ---
        var parent1Account = accountRepository.findByUser_Id(scenario.parent1().getId()).orElseThrow();
        var parent2Account = accountRepository.findByUser_Id(scenario.parent2().getId()).orElseThrow();
        var treasurerAccount = accountRepository.findByUser_Id(scenario.treasurer().getId()).orElseThrow();

        // Rodzic1 powinien odzyskać 400 zł.
        // Stan końcowy: 200 zł (po wszystkich wpłatach) + 400 zł (zwrot) = 600 zł
        assertThat(parent1Account.getBalance()).isEqualByComparingTo("600.00");

        // Parent2's balance should be untouched.
        assertThat(parent2Account.getBalance()).isEqualByComparingTo("1000.00");

        // Treasurer's balance should be untouched.
        assertThat(treasurerAccount.getBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void removeParticipant_afterContribution_createsPendingRefundRequests() {
        Fundraiser fundraiser = scenario.fundraiser();
        Long fundraiserId = fundraiser.getId();

        loginAs(scenario.parent1());
        var request = new TransferToFundraiserRequest();
        request.setFundraiserId(fundraiserId);
        request.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request);

        assertDoesNotThrow(() -> fundraiserService.removeParticipant(fundraiserId, scenario.child1().getId()));

        var participant = participantRepository
                .findByFundraiser_IdAndChild_Id(fundraiserId, scenario.child1().getId())
                .orElseThrow();
        assertThat(participant.getStatus()).isEqualTo(EnrollmentStatus.REMOVAL_PENDING);

        var refundRequests = refundRequestRepository.findByParticipant_Fundraiser_IdAndStatus(
                fundraiserId, EnrollmentStatus.PENDING);
        assertThat(refundRequests).hasSize(1);
        assertThat(refundRequests.get(0).getType()).isEqualTo(RefundRequestType.PERSONAL_CONTRIBUTION);
        assertThat(refundRequests.get(0).getAmount()).isEqualByComparingTo("400.00");
    }

    @Test
    void refundResetsParticipantStateCorrectly() {
        // 1. Setup: Fundraiser with goal 1200 (400 per child). All parents have 1000.
        Fundraiser fundraiser = scenario.fundraiser();
        Long fundraiserId = fundraiser.getId();

        // 2. Parent1 pays for Parent2's child
        loginAs(scenario.parent1());
        var request = new TransferToFundraiserRequest();
        request.setFundraiserId(fundraiserId);
        request.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request); // Parent1 pays 400 for Child2
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).get().getBalance()).isEqualByComparingTo("600.00");

        // 3. Parent1 requests a refund because the child is no longer participating
        var refundRequestDto = refundRequestService.createRefundRequest(fundraiserId, scenario.child2().getId());
        assertThat(refundRequestDto).isNotNull();
        assertThat(refundRequestDto.getAmount()).isEqualByComparingTo("400.00");

        // 4. Treasurer approves the refund
        loginAs(scenario.treasurer());
        refundRequestService.approveRefundRequest(refundRequestDto.getId());

        // 5. Verification: Check if participant state is reset
        var participantAfterRefund = participantRepository.findByFundraiser_IdAndChild_Id(fundraiserId, scenario.child2().getId()).orElseThrow();
        var parent1Account = accountRepository.findByUser_Id(scenario.parent1().getId()).orElseThrow();

        // Parent1's balance should be restored to its initial state
        assertThat(parent1Account.getBalance()).isEqualByComparingTo("1000.00"); // 600 + 400

        // Participant's debt should be reset to the original goal, and credit should be zero
        assertThat(participantAfterRefund.getDebt()).isEqualByComparingTo("400.00");
        assertThat(participantAfterRefund.getCredit()).isEqualByComparingTo("0.00");
    }

    @Test
    void withdrawAll_whenAllParentsPaid_treasurerEndsFundraiser_balancesAreCorrect() {
        // 1. All parents pay their contributions
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        loginAs(scenario.treasurer());
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(scenario.fundraiser().getId());
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 2. Treasurer withdraws all funds
        fundraiserService.withdrawAll(scenario.fundraiser().getId());

        // 3. Verify balances and fundraiser status
        var fundraiser = fundraiserRepository.findById(scenario.fundraiser().getId()).orElseThrow();
        var fundraiserAccount = fundraiser.getAccount();
        var treasurerAccount = accountRepository.findByUser_Id(scenario.treasurer().getId()).orElseThrow();

        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00");
        assertThat(treasurerAccount.getBalance()).isEqualByComparingTo("1800.00"); // 1000 (initial) - 400 (paid) + 1200 (withdrawn)
        assertThat(fundraiser.getStatus()).isEqualTo(FundraiserStatus.FINISHED);
    }

    @Test
    void withdrawAll_afterManualWithdrawal_treasurerEndsFundraiser_balancesAreCorrect() {
        // 1. All parents pay their contributions
        loginAs(scenario.parent1());
        var request1 = new TransferToFundraiserRequest();
        request1.setFundraiserId(scenario.fundraiser().getId());
        request1.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request1);

        loginAs(scenario.parent2());
        var request2 = new TransferToFundraiserRequest();
        request2.setFundraiserId(scenario.fundraiser().getId());
        request2.setChildId(scenario.child2().getId());
        accountService.transferToFundraiser(request2);

        loginAs(scenario.treasurer());
        var request3 = new TransferToFundraiserRequest();
        request3.setFundraiserId(scenario.fundraiser().getId());
        request3.setChildId(scenario.treasurerChild().getId());
        accountService.transferToFundraiser(request3);

        // 2. Treasurer manually withdraws all funds
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("1200.00"), "Manual withdrawal");

        // 3. Treasurer ends the fundraiser
        fundraiserService.withdrawAll(scenario.fundraiser().getId());

        // 4. Verify balances and fundraiser status
        var fundraiser = fundraiserRepository.findById(scenario.fundraiser().getId()).orElseThrow();
        var fundraiserAccount = fundraiser.getAccount();
        var treasurerAccount = accountRepository.findByUser_Id(scenario.treasurer().getId()).orElseThrow();

        assertThat(fundraiserAccount.getBalance()).isEqualByComparingTo("0.00");
        assertThat(treasurerAccount.getBalance()).isEqualByComparingTo("1800.00"); // 1000 (initial) - 400 (paid) + 1200 (withdrawn)
        assertThat(fundraiser.getStatus()).isEqualTo(FundraiserStatus.FINISHED);
    }


    private User saveUnrelatedParent() {
        User user = new User();
        user.setEmail("niepowiazany@example.com");
        user.setFirstName("Niepowiazany");
        user.setLastName("Rodzic");
        user.setPasswordHash(passwordEncoder.encode("pass123"));
        user.setAdmin(false);
        user.setEnabled(true);
        return userRepository.save(user);
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