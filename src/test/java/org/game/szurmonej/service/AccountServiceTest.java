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
        loginAs(scenario.parent());

        MoneyOperationResponse response = accountService.depositToOwnAccount(new BigDecimal("25.00"));

        assertThat(response.getSourceBalance()).isEqualByComparingTo("525.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent().getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("525.00");
    }

    @Test
    void transferToFundraiser_movesMoneyAndCreatesContribution() {
        loginAs(scenario.parent());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child().getId());
        request.setNote("składka");

        MoneyOperationResponse response = accountService.transferToFundraiser(request);

        assertThat(response.getSourceBalance()).isEqualByComparingTo("300.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("200.00");
        assertThat(response.getContributionId()).isNotNull();
        assertThat(contributionRepository.count()).isEqualTo(1);
    }

    @Test
    void transferToFundraiser_allowsPaymentForUnrelatedChild() {
        loginAs(scenario.parent());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.otherChild().getId());

        MoneyOperationResponse response = accountService.transferToFundraiser(request);

        assertThat(response.getContributionId()).isNotNull();
        assertThat(response.getSourceBalance()).isEqualByComparingTo("300.00");
    }

    @Test
    void transferToFundraiser_throwsWhenInsufficientFunds() {
        loginAs(scenario.parent());
        
        // Drain the parent's account
        accountService.withdrawFromFundraiser(scenario.fundraiser().getId(), new BigDecimal("500.00"), "test");

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child().getId());

        assertThatThrownBy(() -> accountService.transferToFundraiser(request))
                .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void transferToFundraiser_throwsWhenParticipantMissing() {
        loginAs(scenario.parent());

        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(99999L);

        assertThatThrownBy(() -> accountService.transferToFundraiser(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void refundFromFundraiser_onlyTreasurerCanRefund() {
        loginAs(scenario.parent());
        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child().getId());
        accountService.transferToFundraiser(request);

        loginAs(scenario.otherParent());
        assertThatThrownBy(() -> accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.parent().getId(),
                new BigDecimal("10.00"),
                "Test refund"
        )).isInstanceOf(ForbiddenOperationException.class);

        loginAs(scenario.treasurer());
        MoneyOperationResponse response = accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.parent().getId(),
                new BigDecimal("10.00"),
                "Test refund"
        );

        assertThat(response.getSourceBalance()).isEqualByComparingTo("190.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("310.00");
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
