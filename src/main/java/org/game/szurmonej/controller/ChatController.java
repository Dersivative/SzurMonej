package org.game.szurmonej.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.game.szurmonej.dto.ChatMessageCreateRequest;
import org.game.szurmonej.dto.ChatMessageResponse;
import org.game.szurmonej.dto.ChatParticipantActionRequest;
import org.game.szurmonej.dto.ChatResponse;
import org.game.szurmonej.dto.ChatSummaryResponse;
import org.game.szurmonej.dto.DirectChatCreateRequest;
import org.game.szurmonej.dto.GroupChatCreateRequest;
import org.game.szurmonej.dto.RelatedUserResponse;
import org.game.szurmonej.service.ChatAccessService;
import org.game.szurmonej.service.ChatMessageService;
import org.game.szurmonej.service.ChatParticipantService;
import org.game.szurmonej.service.ChatService;
import org.game.szurmonej.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Chat", description = "Czat REST z pollingiem wiadomości")
@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;
    private final ChatMessageService chatMessageService;
    private final ChatParticipantService chatParticipantService;
    private final ChatAccessService chatAccessService;
    private final CurrentUserService currentUserService;

    public ChatController(
            ChatService chatService,
            ChatMessageService chatMessageService,
            ChatParticipantService chatParticipantService,
            ChatAccessService chatAccessService,
            CurrentUserService currentUserService
    ) {
        this.chatService = chatService;
        this.chatMessageService = chatMessageService;
        this.chatParticipantService = chatParticipantService;
        this.chatAccessService = chatAccessService;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "Lista czatów zalogowanego użytkownika")
    @GetMapping("/chats")
    public ResponseEntity<List<ChatSummaryResponse>> listChats() {
        return ResponseEntity.ok(chatService.listMyChats());
    }

    @Operation(summary = "Wyszukaj powiązanych użytkowników do czatu grupowego")
    @GetMapping("/chats/related-users")
    public ResponseEntity<List<RelatedUserResponse>> searchRelatedUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long excludeChatId
    ) {
        List<RelatedUserResponse> users = chatAccessService
                .searchRelatedUsers(currentUserService.getCurrentUser(), q, excludeChatId)
                .stream()
                .map(RelatedUserResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @Operation(summary = "Utwórz lub pobierz czat indywidualny")
    @PostMapping("/chats/direct")
    public ResponseEntity<ChatResponse> createDirectChat(@RequestBody DirectChatCreateRequest request) {
        return ResponseEntity.ok(chatService.getOrCreateDirectChat(request));
    }

    @Operation(summary = "Utwórz czat grupowy")
    @PostMapping("/chats/group")
    public ResponseEntity<ChatResponse> createGroupChat(@RequestBody GroupChatCreateRequest request) {
        return ResponseEntity.ok(chatService.createGroupChat(request));
    }

    @Operation(summary = "Pobierz lub utwórz czat klasy")
    @GetMapping("/school-classes/{classId}/chat")
    public ResponseEntity<ChatResponse> getClassChat(@PathVariable Long classId) {
        return ResponseEntity.ok(chatService.getOrCreateClassChat(classId));
    }

    @Operation(summary = "Pobierz lub utwórz czat zbiórki")
    @GetMapping("/fundraisers/{fundraiserId}/chat")
    public ResponseEntity<ChatResponse> getFundraiserChat(@PathVariable Long fundraiserId) {
        return ResponseEntity.ok(chatService.getOrCreateFundraiserChat(fundraiserId));
    }

    @Operation(summary = "Szczegóły czatu")
    @GetMapping("/chats/{chatId}")
    public ResponseEntity<ChatResponse> getChat(@PathVariable Long chatId) {
        return ResponseEntity.ok(chatService.getChat(chatId));
    }

    @Operation(summary = "Dodaj uczestnika do czatu grupowego")
    @PostMapping("/chats/{chatId}/participants")
    public ResponseEntity<Void> addParticipant(
            @PathVariable Long chatId,
            @RequestBody ChatParticipantActionRequest request
    ) {
        chatParticipantService.addParticipant(chatId, request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Usuń uczestnika z czatu grupowego")
    @DeleteMapping("/chats/{chatId}/participants/{userId}")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable Long chatId,
            @PathVariable Long userId
    ) {
        chatParticipantService.removeParticipant(chatId, userId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Wyślij wiadomość")
    @PostMapping("/chats/{chatId}/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @PathVariable Long chatId,
            @RequestBody ChatMessageCreateRequest request
    ) {
        return ResponseEntity.ok(chatMessageService.sendMessage(chatId, request));
    }

    @Operation(summary = "Pobierz wiadomości (polling / historia)")
    @GetMapping("/chats/{chatId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable Long chatId,
            @RequestParam(required = false) Long afterId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(chatMessageService.getMessages(chatId, afterId, beforeId, limit));
    }
}
