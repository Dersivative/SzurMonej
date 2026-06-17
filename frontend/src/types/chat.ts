export type ChatType = 'DIRECT' | 'CLASS' | 'FUNDRAISER' | 'GROUP';

export interface ChatUser {
    id: number;
    fullName: string;
    email: string;
}

export interface ChatMessage {
    id: number;
    content: string;
    sentAt: string;
    sender: ChatUser;
}

export interface ChatSummary {
    id: number;
    type: ChatType;
    title: string;
    contextLabel: string;
    lastMessage?: ChatMessage;
}

export interface ChatDetails extends ChatSummary {
    participants: ChatUser[];
}
