package org.game.szurmonej.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.AccountHistoryEntry;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.repository.*;
import org.game.szurmonej.report.FinancialReportService;
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

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class FinancialReportServiceTest {

    private static final byte[] TINY_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    );

    @Autowired
    private FinancialReportService financialReportService;

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
    private ClassMembershipRepository classMembershipRepository;

    @Autowired
    private AccountHistoryEntryRepository historyRepository;

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

    @Test
    void generateFundraiserReport_treasurerReceivesPdfWithFundraiserDetails() throws IOException {
        loginAs(scenario.treasurer());
        fundFundraiser();

        byte[] pdf = financialReportService.generateFundraiserReport(scenario.fundraiser().getId());
        String text = extractPdfText(pdf);

        assertThat(pdf).isNotEmpty();
        assertThat(text).contains("Raport finansowy zbiórki");
        assertThat(text).contains("Wycieczka");
        assertThat(text).contains("Skarbnik Klasowy");
        assertThat(text).contains("Uczestnicy");
        assertThat(text).contains("Historia operacji");
    }

    @Test
    void generateFundraiserReport_adminCanDownload() {
        User admin = scenario.treasurer();
        admin.setAdmin(true);
        userRepository.save(admin);
        loginAs(admin);
        fundFundraiser();

        byte[] pdf = financialReportService.generateFundraiserReport(scenario.fundraiser().getId());
        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFundraiserReport_parentIsForbidden() {
        loginAs(scenario.parent1());
        assertThatThrownBy(() -> financialReportService.generateFundraiserReport(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void generateFundraiserReport_unrelatedTreasurerIsForbidden() {
        User otherTreasurer = new User();
        otherTreasurer.setEmail("inny@example.com");
        otherTreasurer.setFirstName("Inny");
        otherTreasurer.setLastName("Skarbnik");
        otherTreasurer.setPasswordHash(passwordEncoder.encode("pass123"));
        otherTreasurer.setEnabled(true);
        otherTreasurer.setAdmin(false);
        loginAs(userRepository.save(otherTreasurer));

        assertThatThrownBy(() -> financialReportService.generateFundraiserReport(scenario.fundraiser().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void generateFundraiserReport_includesAttachmentReference() throws IOException {
        loginAs(scenario.treasurer());
        fundFundraiser();
        accountService.withdrawFromFundraiser(
                scenario.fundraiser().getId(),
                new BigDecimal("100.00"),
                "Zakup materiałów"
        );

        AccountHistoryEntry withdrawal = historyRepository.findByAccount_Fundraiser_Id(scenario.fundraiser().getId()).stream()
                .filter(entry -> "WITHDRAWAL_TREASURER".equals(entry.getType()))
                .findFirst()
                .orElseThrow();
        withdrawal.setAttachment(TINY_PNG);
        withdrawal.setAttachmentContentType("image/png");
        withdrawal.setAttachmentFilename("paragon.png");
        historyRepository.save(withdrawal);

        byte[] pdf = financialReportService.generateFundraiserReport(scenario.fundraiser().getId());
        String text = extractPdfText(pdf);

        assertThat(text).contains("zał. 1");
        assertThat(text).contains("Załącznik 1");
    }

    @Test
    void generateClassReport_treasurerReceivesPdfWithClassSummary() throws IOException {
        loginAs(scenario.treasurer());
        fundFundraiser();

        byte[] pdf = financialReportService.generateClassReport(scenario.schoolClass().getId());
        String text = extractPdfText(pdf);

        assertThat(pdf).isNotEmpty();
        assertThat(text).contains("Raport finansowy klasy");
        assertThat(text).contains("3A");
        assertThat(text).contains("Spis zbiórek");
        assertThat(text).contains("Wycieczka");
    }

    @Test
    void generateClassReport_parentIsForbidden() {
        loginAs(scenario.parent1());
        assertThatThrownBy(() -> financialReportService.generateClassReport(scenario.schoolClass().getId()))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    private void fundFundraiser() {
        loginAs(scenario.parent1());
        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request);
        loginAs(scenario.treasurer());
    }

    private String extractPdfText(byte[] pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private void loginAs(User user) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority(user.isAdmin() ? "ROLE_ADMIN" : "ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
