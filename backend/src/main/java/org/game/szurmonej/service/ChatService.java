package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChatResponse;
import org.game.szurmonej.dto.ChatSummaryResponse;
import org.game.szurmonej.dto.DirectChatCreateRequest;
import org.game.szurmonej.dto.GroupChatCreateRequest;
import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ChatParticipant;
import org.game.szurmonej.entity.ChatType;
import org.game.szurmonej.entity.Fundraiser;
import org.game.szurmonej.entity.SchoolClass;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.ChatMessageRepository;
import org.game.szurmonej.repository.ChatParticipantRepository;
import org.game.szurmonej.repository.ChatRepository;
import org.game.szurmonej.repository.FundraiserRepository;
import org.game.szurmonej.repository.SchoolClassRepository;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final FundraiserRepository fundraiserRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ChatAccessService chatAccessService;

    public ChatService(
            ChatRepository chatRepository,
            ChatParticipantRepository chatParticipantRepository,
            ChatMessageRepository chatMessageRepository,
            SchoolClassRepository schoolClassRepository,
            FundraiserRepository fundraiserRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            ChatAccessService chatAccessService
    ) {
        this.chatRepository = chatRepository;
        this.chatParticipantRepository = chatParticipantRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.schoolClassRepository = schoolClassRepository;
        this.fundraiserRepository = fundraiserRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.chatAccessService = chatAccessService;
    }

    @Transactional(readOnly = true)
    public List<ChatSummaryResponse> listMyChats() {
        User currentUser = currentUserService.getCurrentUser();

        return chatRepository.findAll().stream()
                .filter(chat -> chatAccessService.hasAccessToChat(chat, currentUser))
                .map(chat -> ChatSummaryResponse.from(toChatResponse(chat)))
                .sorted(Comparator.comparing(ChatSummaryResponse::getId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChatResponse getChat(Long chatId) {
        User currentUser = currentUserService.getCurrentUser();
        Chat chat = getChatOrThrow(chatId);
        chatAccessService.assertCanAccessChat(chat, currentUser);
        return toChatResponse(chat);
    }

    @Transactional
    public ChatResponse getOrCreateDirectChat(DirectChatCreateRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("userId is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        User otherUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        if (currentUser.getId().equals(otherUser.getId())) {
            throw new IllegalArgumentException("Cannot create a direct chat with yourself");
        }

        chatAccessService.assertUsersRelated(currentUser, otherUser);

        Long userOneId = Math.min(currentUser.getId(), otherUser.getId());
        Long userTwoId = Math.max(currentUser.getId(), otherUser.getId());

        Chat chat = chatRepository.findByTypeAndParticipantOne_IdAndParticipantTwo_Id(
                        ChatType.DIRECT, userOneId, userTwoId)
                .orElseGet(() -> createDirectChat(currentUser, otherUser, userOneId, userTwoId));

        return toChatResponse(chat);
    }

    @Transactional
    public ChatResponse getOrCreateClassChat(Long classId) {
        User currentUser = currentUserService.getCurrentUser();
        chatAccessService.assertCanAccessClass(classId, currentUser);

        SchoolClass schoolClass = schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("School class not found: " + classId));

        Chat chat = chatRepository.findBySchoolClass_IdAndType(classId, ChatType.CLASS)
                .orElseGet(() -> createClassChat(schoolClass, currentUser));

        return toChatResponse(chat);
    }

    @Transactional
    public ChatResponse getOrCreateFundraiserChat(Long fundraiserId) {
        User currentUser = currentUserService.getCurrentUser();
        chatAccessService.assertCanAccessFundraiser(fundraiserId, currentUser);

        Fundraiser fundraiser = fundraiserRepository.findById(fundraiserId)
                .orElseThrow(() -> new ResourceNotFoundException("Fundraiser not found: " + fundraiserId));

        Chat chat = chatRepository.findByFundraiser_IdAndType(fundraiserId, ChatType.FUNDRAISER)
                .orElseGet(() -> createFundraiserChat(fundraiser, currentUser));

        return toChatResponse(chat);
    }

    @Transactional
    public ChatResponse createGroupChat(GroupChatCreateRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        Chat chat = new Chat();
        chat.setType(ChatType.GROUP);
        chat.setTitle(request.getTitle().trim());
        chat.setCreatedAt(Instant.now());
        chat.setCreatedBy(currentUser);
        chat = chatRepository.save(chat);

        addParticipant(chat, currentUser);

        if (request.getParticipantIds() != null) {
            for (Long participantId : new HashSet<>(request.getParticipantIds())) {
                if (participantId.equals(currentUser.getId())) {
                    continue;
                }
                User participant = userRepository.findById(participantId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + participantId));
                chatAccessService.assertUsersRelated(currentUser, participant);
                addParticipant(chat, participant);
            }
        }

        return toChatResponse(chat);
    }

    @Transactional(readOnly = true)
    public Chat getChatOrThrow(Long chatId) {
        return chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found: " + chatId));
    }

    private ChatResponse toChatResponse(Chat chat) {
        List<ChatParticipant> participants = new ArrayList<>();
        if (chat.getType() == ChatType.DIRECT || chat.getType() == ChatType.GROUP) {
            participants = chatParticipantRepository.findByChat_Id(chat.getId());
        }
        return ChatResponse.from(chat, chatMessageRepository.findTopByChat_IdOrderByIdDesc(chat.getId()).orElse(null), participants);
    }

    private Chat createDirectChat(User currentUser, User otherUser, Long userOneId, Long userTwoId) {
        User userOne = userOneId.equals(currentUser.getId()) ? currentUser : otherUser;
        User userTwo = userTwoId.equals(currentUser.getId()) ? currentUser : otherUser;

        Chat chat = new Chat();
        chat.setType(ChatType.DIRECT);
        chat.setTitle(userOne.getFullName() + " & " + userTwo.getFullName());
        chat.setParticipantOne(userOne);
        chat.setParticipantTwo(userTwo);
        chat.setCreatedAt(Instant.now());
        chat.setCreatedBy(currentUser);
        chat = chatRepository.save(chat);

        addParticipant(chat, userOne);
        addParticipant(chat, userTwo);
        return chat;
    }

    private Chat createClassChat(SchoolClass schoolClass, User currentUser) {
        Chat chat = new Chat();
        chat.setType(ChatType.CLASS);
        chat.setTitle("Czat klasy: " + schoolClass.getLabel());
        chat.setSchoolClass(schoolClass);
        chat.setCreatedAt(Instant.now());
        chat.setCreatedBy(currentUser);
        return chatRepository.save(chat);
    }

    private Chat createFundraiserChat(Fundraiser fundraiser, User currentUser) {
        Chat chat = new Chat();
        chat.setType(ChatType.FUNDRAISER);
        chat.setTitle("Czat zbiórki: " + fundraiser.getTitle());
        chat.setFundraiser(fundraiser);
        chat.setCreatedAt(Instant.now());
        chat.setCreatedBy(currentUser);
        return chatRepository.save(chat);
    }

    private void addParticipant(Chat chat, User user) {
        if (chatParticipantRepository.existsByChat_IdAndUser_Id(chat.getId(), user.getId())) {
            return;
        }
        ChatParticipant participant = new ChatParticipant();
        participant.setChat(chat);
        participant.setUser(user);
        participant.setJoinedAt(Instant.now());
        chatParticipantRepository.save(participant);
    }
}
