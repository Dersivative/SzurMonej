package org.game.szurmonej.service;

import org.game.szurmonej.dto.ChatMessageCreateRequest;
import org.game.szurmonej.dto.ChatMessageResponse;
import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ChatMessage;
import org.game.szurmonej.entity.User;
import org.game.szurmonej.repository.ChatMessageRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatMessageService {

    private static final int MAX_CONTENT_LENGTH = 2000;
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatService chatService;
    private final ChatAccessService chatAccessService;
    private final CurrentUserService currentUserService;

    public ChatMessageService(
            ChatMessageRepository chatMessageRepository,
            ChatService chatService,
            ChatAccessService chatAccessService,
            CurrentUserService currentUserService
    ) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatService = chatService;
        this.chatAccessService = chatAccessService;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long chatId, ChatMessageCreateRequest request) {
        validateContent(request.getContent());

        User currentUser = currentUserService.getCurrentUser();
        Chat chat = chatService.getChatOrThrow(chatId);
        chatAccessService.assertCanAccessChat(chat, currentUser);

        ChatMessage message = new ChatMessage();
        message.setChat(chat);
        message.setSender(currentUser);
        message.setContent(request.getContent().trim());
        message.setSentAt(Instant.now());

        return ChatMessageResponse.from(chatMessageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(Long chatId, Long afterId, Long beforeId, Integer limit) {
        User currentUser = currentUserService.getCurrentUser();
        Chat chat = chatService.getChatOrThrow(chatId);
        chatAccessService.assertCanAccessChat(chat, currentUser);

        int pageSize = normalizeLimit(limit);
        List<ChatMessage> messages;

        if (afterId != null && beforeId != null) {
            throw new IllegalArgumentException("Use either afterId or beforeId, not both");
        }

        if (afterId != null) {
            messages = chatMessageRepository.findByChat_IdAndIdGreaterThanOrderByIdAsc(
                    chatId, afterId, PageRequest.of(0, pageSize));
        } else if (beforeId != null) {
            messages = chatMessageRepository.findByChat_IdAndIdLessThanOrderByIdDesc(
                    chatId, beforeId, PageRequest.of(0, pageSize));
            Collections.reverse(messages);
        } else {
            messages = chatMessageRepository.findByChat_IdOrderByIdDesc(chatId, PageRequest.of(0, pageSize));
            Collections.reverse(messages);
        }

        return messages.stream()
                .map(ChatMessageResponse::from)
                .collect(Collectors.toList());
    }

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content is required");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Message content must be at most " + MAX_CONTENT_LENGTH + " characters");
        }
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
