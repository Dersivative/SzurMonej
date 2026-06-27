package org.game.szurmonej.controller;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.game.szurmonej.dto.TransferToFundraiserRequest;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.*;
import org.game.szurmonej.service.AccountService;
import org.game.szurmonej.support.FinancialTestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.session.store-type=none")
class FinancialReportIntegrationTest {

    @Autowired
    private WebApplicationContext context;

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
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private FinancialTestFixtures.FinancialScenario scenario;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

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
    void treasurerCanDownloadFundraiserReportPdf() throws Exception {
        fundFundraiser();
        loginAs(scenario.treasurer());

        MvcResult result = mockMvc.perform(get("/api/fundraisers/{id}/report", scenario.fundraiser().getId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andReturn();

        byte[] pdf = result.getResponse().getContentAsByteArray();
        assertThat(pdf.length).isGreaterThan(0);

        String text = extractPdfText(pdf);
        assertThat(text).contains("Wycieczka");
        assertThat(text).contains("Skarbnik Klasowy");
    }

    @Test
    void parentCanDownloadFundraiserReport() throws Exception {
        loginAs(scenario.parent1());

        mockMvc.perform(get("/api/fundraisers/{id}/report", scenario.fundraiser().getId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    void unrelatedParentCannotDownloadFundraiserReport() throws Exception {
        User unrelatedParent = new User();
        unrelatedParent.setEmail("niepowiazany@example.com");
        unrelatedParent.setFirstName("Niepowiazany");
        unrelatedParent.setLastName("Rodzic");
        unrelatedParent.setPasswordHash(passwordEncoder.encode("pass123"));
        unrelatedParent.setEnabled(true);
        unrelatedParent.setAdmin(false);
        loginAs(userRepository.save(unrelatedParent));

        mockMvc.perform(get("/api/fundraisers/{id}/report", scenario.fundraiser().getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parentCanDownloadClassReportPdf() throws Exception {
        loginAs(scenario.parent1());

        mockMvc.perform(get("/api/school-classes/{id}/report", scenario.schoolClass().getId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    void treasurerCanDownloadClassReportPdf() throws Exception {
        fundFundraiser();
        loginAs(scenario.treasurer());

        MvcResult result = mockMvc.perform(get("/api/school-classes/{id}/report", scenario.schoolClass().getId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andReturn();

        byte[] pdf = result.getResponse().getContentAsByteArray();
        assertThat(pdf.length).isGreaterThan(0);

        String text = extractPdfText(pdf);
        assertThat(text).contains("Raport finansowy klasy");
        assertThat(text).contains("3A");
    }

    private void fundFundraiser() {
        loginAs(scenario.parent1());
        TransferToFundraiserRequest request = new TransferToFundraiserRequest();
        request.setFundraiserId(scenario.fundraiser().getId());
        request.setChildId(scenario.child1().getId());
        accountService.transferToFundraiser(request);
    }

    private String extractPdfText(byte[] pdf) throws Exception {
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
