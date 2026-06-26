package org.game.szurmonej.service;

import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.InsufficientFundsException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.*;
import org.game.szurmonej.support.FinancialTestFixtures;
import org.game.szurmonej.support.FinancialTestFixtures.FinancialScenario;
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

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class AccountServiceTest {

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
    private ContributionRepository contributionRepository;

    @Autowired
    private ClassMembershipRepository classMembershipRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private FinancialScenario scenario;

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

    @Test
    void depositToOwnAccount_increasesBalance() {
        loginAs(scenario.parent1());

        MoneyOperationResponse response = accountService.depositToOwnAccount(new BigDecimal("25.00"));

        assertThat(response.getSourceBalance()).isEqualByComparingTo("1025.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("1025.00");
    }

    @Test
    void withdrawFromOwnAccount_decreasesBalance() {
        loginAs(scenario.parent1());

        MoneyOperationResponse response = accountService.withdrawFromOwnAccount(new BigDecimal("100.00"));

        assertThat(response.getSourceBalance()).isEqualByComparingTo("900.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent1().getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("900.00");
    }

    @Test
    void withdrawFromOwnAccount_throwsWhenInsufficientFunds() {
        loginAs(scenario.parent1());

        assertThatThrownBy(() -> accountService.withdrawFromOwnAccount(new BigDecimal("1600.00")))
                .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void withdrawFromOwnAccount_throwsWhenAmountNotPositive() {
        loginAs(scenario.parent1());

        assertThatThrownBy(() -> accountService.withdrawFromOwnAccount(BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void transferToFundraiser_movesMoneyAndCreatesContribution() {
        loginAs(scenario.parent1());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());
        request.setNote("składka");

        MoneyOperationResponse response = accountService.transferToFundraiser(request);

        assertThat(response.getSourceBalance()).isEqualByComparingTo("600.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("400.00");
        assertThat(response.getContributionId()).isNotNull();
        assertThat(contributionRepository.count()).isEqualTo(1);
    }

    @Test
    void transferToFundraiser_allowsPaymentForUnrelatedChild() {
        loginAs(scenario.parent1());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child2().getId());

        MoneyOperationResponse response = accountService.transferToFundraiser(request);

        assertThat(response.getContributionId()).isNotNull();
        assertThat(response.getSourceBalance()).isEqualByComparingTo("600.00");
    }

    @Test
    void transferToFundraiser_throwsWhenInsufficientFunds() {
        loginAs(scenario.parent1());

        accountService.withdrawFromOwnAccount(new BigDecimal("700.00"));

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());

        assertThatThrownBy(() -> accountService.transferToFundraiser(request))
                .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void transferToFundraiser_throwsWhenParticipantMissing() {
        loginAs(scenario.parent1());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(99999L);

        assertThatThrownBy(() -> accountService.transferToFundraiser(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void refundFromFundraiser_onlyTreasurerCanRefund() {
        loginAs(scenario.parent1());
        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request);

        loginAs(scenario.parent2());
        assertThatThrownBy(() -> accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.participant1().getId(),
                scenario.parent1().getId(),
                new BigDecimal("10.00"),
                "Test refund"
        )).isInstanceOf(ForbiddenOperationException.class);

        loginAs(scenario.treasurer());
        MoneyOperationResponse response = accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.participant1().getId(),
                scenario.parent1().getId(),
                new BigDecimal("10.00"),
                "Test refund"
        );

        assertThat(response.getSourceBalance()).isEqualByComparingTo("390.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("610.00");
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