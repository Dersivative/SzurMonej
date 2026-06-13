package org.game.szurmonej.controller;

import org.game.szurmonej.dto.ChildCreateRequest;
import org.game.szurmonej.dto.EnrollmentApplicationRequest;
import org.game.szurmonej.dto.LoginRequest;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "spring.session.store-type=none",
        "spring.docker.compose.enabled=false",
        "app.seed.enabled=false"
})
class ClassEnrollmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @Autowired
    private ClassMembershipRepository classMembershipRepository;

    @Autowired
    private ChildRepository childRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private SchoolClass schoolClass;
    private User treasurer;
    private User parent;
    private User otherParent;

    @BeforeEach
    void setUp() {
        schoolClassRepository.deleteAll();
        childRepository.deleteAll();
        userRepository.deleteAll();

        treasurer = createUser("skarbnik", "skarbnik@example.com", "secret");
        parent = createUser("rodzic", "rodzic@example.com", "secret");
        otherParent = createUser("inny", "inny@example.com", "secret");

        schoolClass = new SchoolClass();
        schoolClass.setLabel("Klasa testowa");
        schoolClass.setTreasurer(treasurer);
        schoolClass = schoolClassRepository.save(schoolClass);
    }

    @Test
    void fullEnrollmentFlow() throws Exception {
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik", "secret");

        MvcResult linkResult = mockMvc.perform(post("/api/school-classes/{classId}/enrollment-link", schoolClass.getId())
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.containsString("/enroll/")))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn();

        String token = jsonMapper.readTree(linkResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/enrollment-links/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classLabel").value("Klasa testowa"))
                .andExpect(jsonPath("$.classId").value(schoolClass.getId().intValue()));

        jakarta.servlet.http.Cookie parentCookie = login("rodzic", "secret");

        ChildCreateRequest childCreateRequest = new ChildCreateRequest();
        childCreateRequest.setName("Jan");
        childCreateRequest.setSurname("Kowalski");
        childCreateRequest.setDateOfBirth(LocalDate.of(2012, 5, 10));

        MvcResult childResult = mockMvc.perform(post("/api/users/me/children")
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(childCreateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Jan"))
                .andReturn();

        long childId = jsonMapper.readTree(childResult.getResponse().getContentAsString()).get("id").asLong();

        EnrollmentApplicationRequest applicationRequest = new EnrollmentApplicationRequest();
        applicationRequest.setChildId(childId);

        mockMvc.perform(post("/api/enrollment-links/{token}/applications", token)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(applicationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.classLabel").value("Klasa testowa"));

        mockMvc.perform(get("/api/school-classes/{classId}/enrollment-applications", schoolClass.getId())
                        .param("status", "PENDING")
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        long applicationId = jsonMapper.readTree(
                mockMvc.perform(get("/api/school-classes/{classId}/enrollment-applications", schoolClass.getId())
                                .param("status", "PENDING")
                                .cookie(treasurerCookie))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        ).get(0).get("id").asLong();

        mockMvc.perform(post("/api/school-classes/{classId}/enrollment-applications/{applicationId}/approve",
                        schoolClass.getId(), applicationId)
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        assertThat(classMembershipRepository.findBySchoolClass_IdAndChild_IdAndLeftAtIsNull(schoolClass.getId(), childId))
                .isPresent();
    }

    @Test
    void duplicatePendingApplicationReturnsBadRequest() throws Exception {
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik", "secret");
        String token = createEnrollmentLink(treasurerCookie);
        jakarta.servlet.http.Cookie parentCookie = login("rodzic", "secret");
        long childId = createChildForParent(parentCookie);

        EnrollmentApplicationRequest applicationRequest = new EnrollmentApplicationRequest();
        applicationRequest.setChildId(childId);

        mockMvc.perform(post("/api/enrollment-links/{token}/applications", token)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(applicationRequest)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/enrollment-links/{token}/applications", token)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(applicationRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void applicationForUnrelatedChildReturnsForbidden() throws Exception {
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik", "secret");
        String token = createEnrollmentLink(treasurerCookie);

        Child otherChild = new Child();
        otherChild.setName("Inne");
        otherChild.setSurname("Dziecko");
        otherChild.setDateOfBirth(LocalDate.of(2011, 1, 1));
        otherChild = childRepository.save(otherChild);

        otherParent.setChildren(new HashSet<>(Set.of(otherChild)));
        otherChild.setParents(new HashSet<>(Set.of(otherParent)));
        userRepository.save(otherParent);
        childRepository.save(otherChild);

        jakarta.servlet.http.Cookie parentCookie = login("rodzic", "secret");

        EnrollmentApplicationRequest applicationRequest = new EnrollmentApplicationRequest();
        applicationRequest.setChildId(otherChild.getId());

        mockMvc.perform(post("/api/enrollment-links/{token}/applications", token)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(applicationRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonTreasurerCannotGenerateLink() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic", "secret");

        mockMvc.perform(post("/api/school-classes/{classId}/enrollment-link", schoolClass.getId())
                        .cookie(parentCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonTreasurerCannotApproveApplication() throws Exception {
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik", "secret");
        String token = createEnrollmentLink(treasurerCookie);
        jakarta.servlet.http.Cookie parentCookie = login("rodzic", "secret");
        long childId = createChildForParent(parentCookie);

        EnrollmentApplicationRequest applicationRequest = new EnrollmentApplicationRequest();
        applicationRequest.setChildId(childId);

        mockMvc.perform(post("/api/enrollment-links/{token}/applications", token)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(applicationRequest)))
                .andExpect(status().isOk());

        long applicationId = jsonMapper.readTree(
                mockMvc.perform(get("/api/school-classes/{classId}/enrollment-applications", schoolClass.getId())
                                .param("status", "PENDING")
                                .cookie(treasurerCookie))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        ).get(0).get("id").asLong();

        mockMvc.perform(post("/api/school-classes/{classId}/enrollment-applications/{applicationId}/approve",
                        schoolClass.getId(), applicationId)
                        .cookie(parentCookie))
                .andExpect(status().isForbidden());
    }

    private User createUser(String username, String email, String password) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setBalance(BigDecimal.ZERO);
        account.setUser(user);
        user.setAccount(account);

        return userRepository.save(user);
    }

    private jakarta.servlet.http.Cookie login(String username, String password) throws Exception {
        LoginRequest login = new LoginRequest();
        login.setUsername(username);
        login.setPassword(password);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();

        jakarta.servlet.http.Cookie sessionCookie = loginResult.getResponse().getCookie("SESSION");
        if (sessionCookie == null) {
            throw new IllegalStateException("Expected SESSION cookie after login");
        }
        return new jakarta.servlet.http.Cookie(sessionCookie.getName(), sessionCookie.getValue());
    }

    private String createEnrollmentLink(jakarta.servlet.http.Cookie treasurerCookie) throws Exception {
        MvcResult linkResult = mockMvc.perform(post("/api/school-classes/{classId}/enrollment-link", schoolClass.getId())
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andReturn();
        return jsonMapper.readTree(linkResult.getResponse().getContentAsString()).get("token").asText();
    }

    private long createChildForParent(jakarta.servlet.http.Cookie parentCookie) throws Exception {
        ChildCreateRequest childCreateRequest = new ChildCreateRequest();
        childCreateRequest.setName("Anna");
        childCreateRequest.setSurname("Nowak");
        childCreateRequest.setDateOfBirth(LocalDate.of(2013, 3, 15));

        MvcResult childResult = mockMvc.perform(post("/api/users/me/children")
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(childCreateRequest)))
                .andExpect(status().isOk())
                .andReturn();

        return jsonMapper.readTree(childResult.getResponse().getContentAsString()).get("id").asLong();
    }
}
