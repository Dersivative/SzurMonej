import axios from 'axios';
import type { ChatDetails, ChatMessage, ChatSummary, ChatUser } from '../types/chat';

export async function listChats(): Promise<ChatSummary[]> {
    const { data } = await axios.get<ChatSummary[]>('/api/chats');
    return data;
}

export async function getChat(chatId: number): Promise<ChatDetails> {
    const { data } = await axios.get<ChatDetails>(`/api/chats/${chatId}`);
    return data;
}

export async function getMessages(
    chatId: number,
    params?: { afterId?: number; beforeId?: number; limit?: number }
): Promise<ChatMessage[]> {
    const { data } = await axios.get<ChatMessage[]>(`/api/chats/${chatId}/messages`, { params });
    return data;
}

export async function sendMessage(chatId: number, content: string): Promise<ChatMessage> {
    const { data } = await axios.post<ChatMessage>(`/api/chats/${chatId}/messages`, { content });
    return data;
}

export async function createDirectChat(userId: number): Promise<ChatDetails> {
    const { data } = await axios.post<ChatDetails>('/api/chats/direct', { userId });
    return data;
}

export async function createGroupChat(title: string, participantIds: number[]): Promise<ChatDetails> {
    const { data } = await axios.post<ChatDetails>('/api/chats/group', { title, participantIds });
    return data;
}

export async function searchRelatedUsers(q?: string, excludeChatId?: number): Promise<ChatUser[]> {
    const { data } = await axios.get<ChatUser[]>('/api/chats/related-users', {
        params: { q, excludeChatId },
    });
    return data;
}

export async function addParticipant(chatId: number, userId: number): Promise<void> {
    await axios.post(`/api/chats/${chatId}/participants`, { userId });
}

export async function removeParticipant(chatId: number, userId: number): Promise<void> {
    await axios.delete(`/api/chats/${chatId}/participants/${userId}`);
}

export async function getOrCreateClassChat(classId: number): Promise<ChatDetails> {
    const { data } = await axios.get<ChatDetails>(`/api/school-classes/${classId}/chat`);
    return data;
}

export async function getOrCreateFundraiserChat(fundraiserId: number): Promise<ChatDetails> {
    const { data } = await axios.get<ChatDetails>(`/api/fundraisers/${fundraiserId}/chat`);
    return data;
}
