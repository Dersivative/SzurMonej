package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChatParticipantActionRequest;
import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ChatParticipant;
import org.game.szurmonej.entity.ChatType;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.exception.ForbiddenOperationException;
import org.game.szurmonej.exception.ResourceNotFoundException;
import org.game.szurmonej.repository.ChatParticipantRepository;
import org.game.szurmonej.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ChatParticipantService {

    private final ChatParticipantRepository chatParticipantRepository;
    private final ChatService chatService;
    private final ChatAccessService chatAccessService;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    public ChatParticipantService(
            ChatParticipantRepository chatParticipantRepository,
            ChatService chatService,
            ChatAccessService chatAccessService,
            CurrentUserService currentUserService,
            UserRepository userRepository
    ) {
        this.chatParticipantRepository = chatParticipantRepository;
        this.chatService = chatService;
        this.chatAccessService = chatAccessService;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
    }

    @Transactional
    public void addParticipant(Long chatId, ChatParticipantActionRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("userId is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        Chat chat = chatService.getChatOrThrow(chatId);
        assertGroupChat(chat);
        chatAccessService.assertCanAccessChat(chat, currentUser);

        User newParticipant = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        chatAccessService.assertUsersRelated(currentUser, newParticipant);

        if (chatParticipantRepository.existsByChat_IdAndUser_Id(chatId, newParticipant.getId())) {
            throw new IllegalArgumentException("User is already a participant of this chat");
        }

        ChatParticipant participant = new ChatParticipant();
        participant.setChat(chat);
        participant.setUser(newParticipant);
        participant.setJoinedAt(Instant.now());
        chatParticipantRepository.save(participant);
    }

    @Transactional
    public void removeParticipant(Long chatId, Long userId) {
        User currentUser = currentUserService.getCurrentUser();
        Chat chat = chatService.getChatOrThrow(chatId);
        assertGroupChat(chat);
        chatAccessService.assertCanAccessChat(chat, currentUser);

        ChatParticipant participant = chatParticipantRepository.findByChat_IdAndUser_Id(chatId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found in this chat"));

        chatParticipantRepository.delete(participant);
    }

    private void assertGroupChat(Chat chat) {
        if (chat.getType() != ChatType.GROUP) {
            throw new ForbiddenOperationException("Participants can only be managed in group chats");
        }
    }
}
