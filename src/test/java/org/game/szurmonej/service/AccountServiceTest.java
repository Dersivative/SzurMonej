package org.game.szurmonej.service;

import org.game.szurmonej.dto.MoneyOperationResponse;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.InsufficientFundsException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ContributionRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.FundraiserRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.repository.UserRepository;
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
    private PasswordEncoder passwordEncoder;

    private FinancialScenario scenario;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        childRepository.deleteAll();
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
    void depositToOwnAccount_increasesBalance() {
        loginAs(scenario.parent());

        MoneyOperationResponse response = accountService.depositToOwnAccount(new BigDecimal("25.00"));

        assertThat(response.getSourceBalance()).isEqualByComparingTo("125.00");
        assertThat(accountRepository.findByUser_Id(scenario.parent().getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("125.00");
    }

    @Test
    void transferToFundraiser_movesMoneyAndCreatesContribution() {
        loginAs(scenario.parent());

        MoneyOperationResponse response = accountService.transferToFundraiser(
                scenario.fundraiser().getId(),
                scenario.child().getId(),
                new BigDecimal("40.00"),
                "składka"
        );

        assertThat(response.getSourceBalance()).isEqualByComparingTo("60.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("40.00");
        assertThat(response.getContributionId()).isNotNull();
        assertThat(contributionRepository.count()).isEqualTo(1);
    }

    @Test
    void transferToFundraiser_allowsPaymentForUnrelatedChild() {
        loginAs(scenario.parent());

        FundraiserParticipant otherParticipant = new FundraiserParticipant();
        otherParticipant.setFundraiser(scenario.fundraiser());
        otherParticipant.setChild(scenario.otherChild());
        otherParticipant.setAddedAt(java.time.LocalDate.now());
        participantRepository.save(otherParticipant);

        MoneyOperationResponse response = accountService.transferToFundraiser(
                scenario.fundraiser().getId(),
                scenario.otherChild().getId(),
                new BigDecimal("10.00"),
                null
        );

        assertThat(response.getContributionId()).isNotNull();
        assertThat(response.getSourceBalance()).isEqualByComparingTo("90.00");
    }

    @Test
    void transferToFundraiser_throwsWhenInsufficientFunds() {
        loginAs(scenario.parent());

        assertThatThrownBy(() -> accountService.transferToFundraiser(
                scenario.fundraiser().getId(),
                scenario.child().getId(),
                new BigDecimal("500.00"),
                null
        )).isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void transferToFundraiser_throwsWhenParticipantMissing() {
        loginAs(scenario.parent());

        assertThatThrownBy(() -> accountService.transferToFundraiser(
                scenario.fundraiser().getId(),
                99999L,
                new BigDecimal("10.00"),
                null
        )).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void refundFromFundraiser_onlyTreasurerCanRefund() {
        loginAs(scenario.parent());
        accountService.transferToFundraiser(
                scenario.fundraiser().getId(),
                scenario.child().getId(),
                new BigDecimal("30.00"),
                null
        );

        loginAs(scenario.otherParent());
        assertThatThrownBy(() -> accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.parent().getId(),
                new BigDecimal("10.00")
        )).isInstanceOf(ForbiddenOperationException.class);

        loginAs(scenario.treasurer());
        MoneyOperationResponse response = accountService.refundFromFundraiser(
                scenario.fundraiser().getId(),
                scenario.parent().getId(),
                new BigDecimal("10.00")
        );

        assertThat(response.getSourceBalance()).isEqualByComparingTo("20.00");
        assertThat(response.getTargetBalance()).isEqualByComparingTo("80.00");
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
