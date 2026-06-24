package org.game.szurmonej.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.game.szurmonej.dto.ChatMessageCreateRequest;
import org.game.szurmonej.dto.ChatParticipantActionRequest;
import org.game.szurmonej.dto.DirectChatCreateRequest;
import org.game.szurmonej.dto.GroupChatCreateRequest;
import org.game.szurmonej.dto.LoginRequest;
import org.game.szurmonej.entity.Account;
import org.game.szurmonej.entity.Child;
import org.game.szurmonej.entity.ClassMembership;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.FundraiserParticipant;
import org.game.szurmonej.entity.FundraiserStatus;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChatRepository;
import org.game.szurmonej.repository.ChildRepository;
import org.game.szurmonej.repository.ClassMembershipRepository;
import org.game.szurmonej.repository.FundraiserParticipantRepository;
import org.game.szurmonej.repository.FundraiserRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
class ChatIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @Autowired
    private ChildRepository childRepository;

    @Autowired
    private ClassMembershipRepository classMembershipRepository;

    @Autowired
    private FundraiserRepository fundraiserRepository;

    @Autowired
    private FundraiserParticipantRepository fundraiserParticipantRepository;

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User treasurer;
    private User parentSameClass;
    private User parentOtherClass;
    private User outsider;
    private SchoolClass schoolClass;
    private SchoolClass otherClass;
    private Fundraiser fundraiser;
    private Child childSameClass;

    @BeforeEach
    void setUp() {
        chatRepository.deleteAll();
        fundraiserParticipantRepository.deleteAll();
        fundraiserRepository.deleteAll();
        classMembershipRepository.deleteAll();
        childRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();

        treasurer = createUser("skarbnik@example.com", "Skarbnik", "Klasowy");
        parentSameClass = createUser("rodzic1@example.com", "Rodzic", "Jeden");
        parentOtherClass = createUser("rodzic2@example.com", "Rodzic", "Dwa");
        outsider = createUser("obcy@example.com", "Obcy", "Uzytkownik");

        schoolClass = createClass("Klasa A", treasurer);
        otherClass = createClass("Klasa B", createUser("skarbnik2@example.com", "Skarbnik", "Drugi"));

        childSameClass = createChild("Jan", "Kowalski", parentSameClass);
        enrollChild(childSameClass, schoolClass);

        Child childOtherClass = createChild("Anna", "Nowak", parentOtherClass);
        enrollChild(childOtherClass, otherClass);

        fundraiser = createFundraiser(schoolClass);
        addFundraiserParticipant(fundraiser, childSameClass);
    }

    @Test
    void directChatBetweenRelatedParents() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik@example.com");

        DirectChatCreateRequest request = new DirectChatCreateRequest();
        request.setUserId(treasurer.getId());

        MvcResult chatResult = mockMvc.perform(post("/api/chats/direct")
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("DIRECT"))
                .andReturn();

        long chatId = objectMapper.readTree(chatResult.getResponse().getContentAsString()).get("id").asLong();

        ChatMessageCreateRequest message = new ChatMessageCreateRequest();
        message.setContent("Witaj skarbniku");

        mockMvc.perform(post("/api/chats/{chatId}/messages", chatId)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(message)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Witaj skarbniku"));

        mockMvc.perform(get("/api/chats/{chatId}/messages", chatId)
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        long messageId = objectMapper.readTree(
                mockMvc.perform(get("/api/chats/{chatId}/messages", chatId).cookie(treasurerCookie)).andReturn()
                        .getResponse().getContentAsString()
        ).get(0).get("id").asLong();

        mockMvc.perform(get("/api/chats/{chatId}/messages", chatId)
                        .param("afterId", String.valueOf(messageId))
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void directChatWithUnrelatedUserReturnsForbidden() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");

        DirectChatCreateRequest request = new DirectChatCreateRequest();
        request.setUserId(parentOtherClass.getId());

        mockMvc.perform(post("/api/chats/direct")
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void classChatAccessibleForTreasurerAndParent() throws Exception {
        jakarta.servlet.http.Cookie treasurerCookie = login("skarbnik@example.com");
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");
        jakarta.servlet.http.Cookie outsiderCookie = login("obcy@example.com");

        MvcResult classChat = mockMvc.perform(get("/api/school-classes/{classId}/chat", schoolClass.getId())
                        .cookie(treasurerCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("CLASS"))
                .andReturn();

        long chatId = objectMapper.readTree(classChat.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/school-classes/{classId}/chat", schoolClass.getId())
                        .cookie(parentCookie))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/chats/{chatId}/messages", chatId)
                        .cookie(outsiderCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void fundraiserChatAccessibleForParticipantParent() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");
        jakarta.servlet.http.Cookie outsiderCookie = login("obcy@example.com");

        MvcResult fundraiserChat = mockMvc.perform(get("/api/fundraisers/{fundraiserId}/chat", fundraiser.getId())
                        .cookie(parentCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FUNDRAISER"))
                .andReturn();

        long chatId = objectMapper.readTree(fundraiserChat.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/chats/{chatId}/messages", chatId)
                        .cookie(outsiderCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void groupChatCreateAddRemoveAndSearchRelatedUsers() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");

        GroupChatCreateRequest createRequest = new GroupChatCreateRequest();
        createRequest.setTitle("Rodzice klasy A");
        createRequest.setParticipantIds(List.of(treasurer.getId()));

        MvcResult groupChat = mockMvc.perform(post("/api/chats/group")
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("GROUP"))
                .andExpect(jsonPath("$.participants", hasSize(2)))
                .andReturn();

        long chatId = objectMapper.readTree(groupChat.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/chats/related-users")
                        .param("q", "Skarbnik")
                        .cookie(parentCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fullName").value("Skarbnik Klasowy"));

        ChatParticipantActionRequest addRequest = new ChatParticipantActionRequest();
        addRequest.setUserId(parentOtherClass.getId());

        mockMvc.perform(post("/api/chats/{chatId}/participants", chatId)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addRequest)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/chats/{chatId}/participants/{userId}", chatId, treasurer.getId())
                        .cookie(parentCookie))
                .andExpect(status().isNoContent());
    }

    @Test
    void emptyAndTooLongMessagesReturnBadRequest() throws Exception {
        jakarta.servlet.http.Cookie parentCookie = login("rodzic1@example.com");

        DirectChatCreateRequest request = new DirectChatCreateRequest();
        request.setUserId(treasurer.getId());

        long chatId = objectMapper.readTree(
                mockMvc.perform(post("/api/chats/direct")
                                .cookie(parentCookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andReturn().getResponse().getContentAsString()
        ).get("id").asLong();

        ChatMessageCreateRequest empty = new ChatMessageCreateRequest();
        empty.setContent("   ");

        mockMvc.perform(post("/api/chats/{chatId}/messages", chatId)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empty)))
                .andExpect(status().isBadRequest());

        ChatMessageCreateRequest tooLong = new ChatMessageCreateRequest();
        tooLong.setContent("x".repeat(2001));

        mockMvc.perform(post("/api/chats/{chatId}/messages", chatId)
                        .cookie(parentCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooLong)))
                .andExpect(status().isBadRequest());
    }

    private User createUser(String email, String firstName, String lastName) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode("secret"));

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setBalance(BigDecimal.ZERO);
        account.setUser(user);
        user.setAccount(account);

        return userRepository.save(user);
    }

    private SchoolClass createClass(String label, User classTreasurer) {
        SchoolClass schoolClassEntity = new SchoolClass();
        schoolClassEntity.setLabel(label);
        schoolClassEntity.setTreasurer(classTreasurer);
        return schoolClassRepository.save(schoolClassEntity);
    }

    private Child createChild(String name, String surname, User parent) {
        Child child = new Child();
        child.setName(name);
        child.setSurname(surname);
        child.setDateOfBirth(LocalDate.of(2012, 1, 1));
        child = childRepository.save(child);

        parent.setChildren(new HashSet<>(Set.of(child)));
        child.setParents(new HashSet<>(Set.of(parent)));
        userRepository.save(parent);
        childRepository.save(child);
        return child;
    }

    private void enrollChild(Child child, SchoolClass schoolClassEntity) {
        ClassMembership membership = new ClassMembership();
        membership.setChild(child);
        membership.setSchoolClass(schoolClassEntity);
        membership.setJoinedAt(LocalDate.now());
        classMembershipRepository.save(membership);
    }

    private Fundraiser createFundraiser(SchoolClass schoolClassEntity) {
        Fundraiser fundraiserEntity = new Fundraiser();
        fundraiserEntity.setTitle("Wycieczka");
        fundraiserEntity.setDescription("Opis");
        fundraiserEntity.setGoalAmount(new BigDecimal("1000.00"));
        fundraiserEntity.setSchoolClass(schoolClassEntity);
        fundraiserEntity.setStartedAt(LocalDate.now());
        fundraiserEntity.setStatus(FundraiserStatus.ACTIVE);

        Account account = new Account();
        account.setAccountNumber(UUID.randomUUID().toString());
        account.setBalance(BigDecimal.ZERO);
        account.setFundraiser(fundraiserEntity);
        fundraiserEntity.setAccount(account);

        return fundraiserRepository.save(fundraiserEntity);
    }

    private void addFundraiserParticipant(Fundraiser fundraiserEntity, Child child) {
        FundraiserParticipant participant = new FundraiserParticipant();
        participant.setFundraiser(fundraiserEntity);
        participant.setChild(child);
        participant.setAddedAt(LocalDate.now());
        fundraiserParticipantRepository.save(participant);
    }

    private jakarta.servlet.http.Cookie login(String email) throws Exception {
        LoginRequest login = new LoginRequest();
        login.setEmail(email);
        login.setPassword("secret");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();

        jakarta.servlet.http.Cookie sessionCookie = loginResult.getResponse().getCookie("SESSION");
        if (sessionCookie == null) {
            throw new IllegalStateException("Expected SESSION cookie after login");
        }
        return new jakarta.servlet.http.Cookie(sessionCookie.getName(), sessionCookie.getValue());
    }
}
