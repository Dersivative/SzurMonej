package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatSummaryResponse {

    private Long id;
    private String type;
    private String title;
    private String contextLabel;
    private ChatMessageResponse lastMessage;

    public static ChatSummaryResponse from(ChatResponse chatResponse) {
        ChatSummaryResponse response = new ChatSummaryResponse();
        response.setId(chatResponse.getId());
        response.setType(chatResponse.getType());
        response.setTitle(chatResponse.getTitle());
        response.setContextLabel(chatResponse.getContextLabel());
        response.setLastMessage(chatResponse.getLastMessage());
        return response;
    }
}
