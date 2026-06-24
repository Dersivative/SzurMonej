package org.game.szurmonej.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.game.szurmonej.entity.Chat;
import org.game.szurmonej.entity.ChatMessage;
import org.game.szurmonej.entity.ChatParticipant;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
public class ChatResponse {

    private Long id;
    private String type;
    private String title;
    private String contextLabel;
    private List<ChatUserResponse> participants;
    private ChatMessageResponse lastMessage;

    public static ChatResponse from(Chat chat, ChatMessage lastMessage, List<ChatParticipant> participants) {
        ChatResponse response = new ChatResponse();
        response.setId(chat.getId());
        response.setType(chat.getType().name());
        response.setTitle(chat.getTitle());
        response.setContextLabel(resolveContextLabel(chat));
        if (participants != null) {
            response.setParticipants(participants.stream()
                    .map(p -> ChatUserResponse.from(p.getUser()))
                    .collect(Collectors.toList()));
        } else {
            response.setParticipants(Collections.emptyList());
        }
        if (lastMessage != null) {
            response.setLastMessage(ChatMessageResponse.from(lastMessage));
        }
        return response;
    }

    private static String resolveContextLabel(Chat chat) {
        return switch (chat.getType()) {
            case CLASS -> chat.getSchoolClass() != null ? chat.getSchoolClass().getLabel() : null;
            case FUNDRAISER -> chat.getFundraiser() != null ? chat.getFundraiser().getTitle() : null;
            case DIRECT -> {
                if (chat.getParticipantOne() != null && chat.getParticipantTwo() != null) {
                    yield chat.getParticipantOne().getFullName() + " & " + chat.getParticipantTwo().getFullName();
                }
                yield chat.getTitle();
            }
            case GROUP -> chat.getTitle();
        };
    }
}
