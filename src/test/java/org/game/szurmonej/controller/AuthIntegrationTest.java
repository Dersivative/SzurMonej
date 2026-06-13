package org.game.szurmonej.controller;

import org.game.szurmonej.dto.AmountRequest;
import org.game.szurmonej.dto.LoginRequest;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.AccountRepository;
import org.game.szurmonej.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "spring.session.store-type=none")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User user = new User();
        user.setUsername("rodzic1");
        user.setEmail("rodzic1@example.com");
        user.setPasswordHash(passwordEncoder.encode("secret"));
        user = userRepository.save(user);

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setUser(user);
        account.setBalance(new BigDecimal("50.00"));
        accountRepository.save(account);
    }

    @Test
    void loginThenDepositWithSession() throws Exception {
        LoginRequest login = new LoginRequest();
        login.setUsername("rodzic1");
        login.setPassword("secret");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("rodzic1"))
                .andReturn();

        jakarta.servlet.http.Cookie sessionCookie = loginResult.getResponse().getCookie("SESSION");
        if (sessionCookie == null) {
            throw new IllegalStateException("Expected SESSION cookie after login");
        }

        AmountRequest deposit = new AmountRequest();
        deposit.setAmount(new BigDecimal("20.00"));

        mockMvc.perform(post("/api/accounts/me/deposit")
                        .cookie(new jakarta.servlet.http.Cookie(sessionCookie.getName(), sessionCookie.getValue()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(deposit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceBalance").value(70.0));
    }

    @Test
    void protectedEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithWrongPasswordReturnsUnauthorized() throws Exception {
        LoginRequest login = new LoginRequest();
        login.setUsername("rodzic1");
        login.setPassword("wrong");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }
}
