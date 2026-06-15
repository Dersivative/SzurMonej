package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.ChatMessage;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class ChatMessageResponse {

    private Long id;
    private String content;
    private Instant sentAt;
    private ChatUserResponse sender;

    public static ChatMessageResponse from(ChatMessage message) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setId(message.getId());
        response.setContent(message.getContent());
        response.setSentAt(message.getSentAt());
        response.setSender(ChatUserResponse.from(message.getSender()));
        return response;
    }
}
