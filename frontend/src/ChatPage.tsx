import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import * as chatApi from './api/chatApi';
import type { ChatDetails, ChatMessage, ChatSummary, ChatType, ChatUser } from './types/chat';
import './ChatPage.css';

const POLL_INTERVAL_MS = 3000;

const TYPE_LABELS: Record<ChatType, string> = {
    DIRECT: 'Prywatny',
    CLASS: 'Klasa',
    FUNDRAISER: 'Zbiórka',
    GROUP: 'Grupa',
};

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function chatDisplayTitle(chat: ChatSummary | ChatDetails): string {
    return chat.contextLabel || chat.title || TYPE_LABELS[chat.type];
}

const ChatPage: React.FC = () => {
    const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [chats, setChats] = useState<ChatSummary[]>([]);
    const [activeChat, setActiveChat] = useState<ChatDetails | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [modalTab, setModalTab] = useState<'direct' | 'group'>('direct');
    const [relatedUsers, setRelatedUsers] = useState<ChatUser[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [groupTitle, setGroupTitle] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<number | null>(null);

    const selectedChatId = chatIdParam ? Number(chatIdParam) : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChats = useCallback(async () => {
        try {
            const data = await chatApi.listChats();
            setChats(data);
        } catch {
            setError('Nie udało się załadować listy czatów.');
        } finally {
            setLoadingChats(false);
        }
    }, []);

    const loadChat = useCallback(async (chatId: number) => {
        try {
            const data = await chatApi.getChat(chatId);
            setActiveChat(data);
        } catch {
            setError('Nie udało się załadować czatu.');
        }
    }, []);

    const loadInitialMessages = useCallback(async (chatId: number) => {
        setLoadingMessages(true);
        try {
            const data = await chatApi.getMessages(chatId, { limit: 50 });
            setMessages(data);
            lastMessageIdRef.current = data.length > 0 ? data[data.length - 1].id : null;
            setTimeout(scrollToBottom, 50);
        } catch {
            setError('Nie udało się załadować wiadomości.');
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const pollMessages = useCallback(async (chatId: number) => {
        const afterId = lastMessageIdRef.current;
        if (afterId === null) return;

        try {
            const newMessages = await chatApi.getMessages(chatId, { afterId, limit: 50 });
            if (newMessages.length > 0) {
                setMessages(prev => [...prev, ...newMessages]);
                lastMessageIdRef.current = newMessages[newMessages.length - 1].id;
                setTimeout(scrollToBottom, 50);
                loadChats();
            }
        } catch {
            // polling errors are silent
        }
    }, [loadChats]);

    useEffect(() => {
        if (isAuthenticated) {
            loadChats();
        }
    }, [isAuthenticated, loadChats]);

    useEffect(() => {
        if (!selectedChatId || Number.isNaN(selectedChatId)) {
            setActiveChat(null);
            setMessages([]);
            lastMessageIdRef.current = null;
            return;
        }

        setError(null);
        loadChat(selectedChatId);
        loadInitialMessages(selectedChatId);
    }, [selectedChatId, loadChat, loadInitialMessages]);

    useEffect(() => {
        if (!selectedChatId || Number.isNaN(selectedChatId)) return;

        const interval = setInterval(() => pollMessages(selectedChatId), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [selectedChatId, pollMessages]);

    const openChat = (chatId: number) => {
        navigate(`/chats/${chatId}`);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChatId || !messageInput.trim() || sending) return;

        setSending(true);
        try {
            const sent = await chatApi.sendMessage(selectedChatId, messageInput.trim());
            setMessages(prev => [...prev, sent]);
            lastMessageIdRef.current = sent.id;
            setMessageInput('');
            setTimeout(scrollToBottom, 50);
            loadChats();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Nie udało się wysłać wiadomości.');
        } finally {
            setSending(false);
        }
    };

    const loadRelatedUsers = useCallback(async (query: string, excludeChatId?: number) => {
        try {
            const users = await chatApi.searchRelatedUsers(query || undefined, excludeChatId);
            setRelatedUsers(users);
        } catch {
            setRelatedUsers([]);
        }
    }, []);

    useEffect(() => {
        if (!showNewChatModal) return;
        const timer = setTimeout(() => {
            loadRelatedUsers(userSearch, modalTab === 'group' ? selectedChatId ?? undefined : undefined);
        }, 300);
        return () => clearTimeout(timer);
    }, [showNewChatModal, userSearch, modalTab, selectedChatId, loadRelatedUsers]);

    const handleStartDirect = async (targetUserId: number) => {
        try {
            const chat = await chatApi.createDirectChat(targetUserId);
            setShowNewChatModal(false);
            setUserSearch('');
            await loadChats();
            openChat(chat.id);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            alert(msg || 'Nie udało się utworzyć czatu.');
        }
    };

    const handleCreateGroup = async () => {
        if (!groupTitle.trim()) {
            alert('Podaj tytuł grupy.');
            return;
        }
        try {
            const chat = await chatApi.createGroupChat(groupTitle.trim(), selectedParticipants);
            setShowNewChatModal(false);
            setGroupTitle('');
            setSelectedParticipants([]);
            await loadChats();
            openChat(chat.id);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            alert(msg || 'Nie udało się utworzyć grupy.');
        }
    };

    const toggleParticipant = (userId: number) => {
        setSelectedParticipants(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAddParticipant = async (userId: number) => {
        if (!selectedChatId) return;
        try {
            await chatApi.addParticipant(selectedChatId, userId);
            await loadChat(selectedChatId);
            setUserSearch('');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            alert(msg || 'Nie udało się dodać uczestnika.');
        }
    };

    const handleRemoveParticipant = async (userId: number) => {
        if (!selectedChatId) return;
        if (!window.confirm('Usunąć uczestnika z grupy?')) return;
        try {
            await chatApi.removeParticipant(selectedChatId, userId);
            if (userId === user?.id) {
                navigate('/chats');
                await loadChats();
                return;
            }
            await loadChat(selectedChatId);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            alert(msg || 'Nie udało się usunąć uczestnika.');
        }
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="chat-page">
            <aside className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h2>Czaty</h2>
                    <button className="chat-btn chat-btn-primary" onClick={() => setShowNewChatModal(true)}>
                        + Nowy
                    </button>
                </div>
                {loadingChats ? (
                    <p style={{ padding: '16px' }}>Ładowanie...</p>
                ) : chats.length === 0 ? (
                    <p style={{ padding: '16px', color: 'var(--text)' }}>Brak czatów. Utwórz nową rozmowę.</p>
                ) : (
                    <ul className="chat-list">
                        {chats.map(chat => (
                            <li
                                key={chat.id}
                                className={`chat-list-item${selectedChatId === chat.id ? ' active' : ''}`}
                                onClick={() => openChat(chat.id)}
                            >
                                <span className="chat-type-badge">{TYPE_LABELS[chat.type]}</span>
                                <div className="chat-list-item-title">{chatDisplayTitle(chat)}</div>
                                {chat.lastMessage && (
                                    <div className="chat-list-item-preview">
                                        <strong>{chat.lastMessage.sender.fullName}:</strong> {chat.lastMessage.content}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </aside>

            <main className="chat-main">
                {!selectedChatId ? (
                    <div className="chat-empty">Wybierz czat z listy lub utwórz nowy.</div>
                ) : (
                    <>
                        <div className="chat-main-header">
                            {activeChat ? (
                                <>
                                    <span className="chat-type-badge">{TYPE_LABELS[activeChat.type]}</span>
                                    <h2>{chatDisplayTitle(activeChat)}</h2>
                                    {activeChat.type === 'GROUP' && (
                                        <div className="chat-participants">
                                            {activeChat.participants.map(p => (
                                                <span key={p.id} className="chat-participant-chip">
                                                    {p.fullName}
                                                    <button
                                                        type="button"
                                                        title="Usuń"
                                                        onClick={() => handleRemoveParticipant(p.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                            <button
                                                className="chat-btn"
                                                onClick={() => {
                                                    setModalTab('group');
                                                    setShowNewChatModal(true);
                                                    loadRelatedUsers('', selectedChatId);
                                                }}
                                            >
                                                + Dodaj
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <h2>Ładowanie...</h2>
                            )}
                        </div>

                        {error && (
                            <div style={{ padding: '8px 20px', color: '#c0392b', fontSize: '14px' }}>{error}</div>
                        )}

                        <div className="chat-messages">
                            {loadingMessages ? (
                                <p>Ładowanie wiadomości...</p>
                            ) : messages.length === 0 ? (
                                <p style={{ color: 'var(--text)' }}>Brak wiadomości. Napisz pierwszą!</p>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`chat-message${msg.sender.id === user?.id ? ' own' : ''}`}
                                    >
                                        <div className="chat-message-sender">{msg.sender.fullName}</div>
                                        <p className="chat-message-content">{msg.content}</p>
                                        <div className="chat-message-time">{formatTime(msg.sentAt)}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-row" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="Napisz wiadomość..."
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                maxLength={2000}
                            />
                            <button type="submit" disabled={sending || !messageInput.trim()}>
                                Wyślij
                            </button>
                        </form>
                    </>
                )}
            </main>

            {showNewChatModal && (
                <div className="chat-modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="chat-modal" onClick={e => e.stopPropagation()}>
                        <h3>Nowa rozmowa</h3>
                        <div className="chat-tabs">
                            <button
                                type="button"
                                className={`chat-tab${modalTab === 'direct' ? ' active' : ''}`}
                                onClick={() => setModalTab('direct')}
                            >
                                Wiadomość prywatna
                            </button>
                            <button
                                type="button"
                                className={`chat-tab${modalTab === 'group' ? ' active' : ''}`}
                                onClick={() => setModalTab('group')}
                            >
                                Grupa
                            </button>
                        </div>

                        {modalTab === 'direct' ? (
                            <>
                                <input
                                    type="text"
                                    placeholder="Szukaj po imieniu, nazwisku lub email..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                                <ul className="chat-user-list">
                                    {relatedUsers.length === 0 ? (
                                        <li style={{ cursor: 'default' }}>Brak powiązanych użytkowników.</li>
                                    ) : (
                                        relatedUsers.map(u => (
                                            <li key={u.id} onClick={() => handleStartDirect(u.id)}>
                                                <strong>{u.fullName}</strong>
                                                <div style={{ fontSize: '13px', color: 'var(--text)' }}>{u.email}</div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </>
                        ) : selectedChatId && activeChat?.type === 'GROUP' ? (
                            <>
                                <input
                                    type="text"
                                    placeholder="Szukaj użytkownika do dodania..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                                <ul className="chat-user-list">
                                    {relatedUsers.map(u => (
                                        <li key={u.id} onClick={() => handleAddParticipant(u.id)}>
                                            <strong>{u.fullName}</strong>
                                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{u.email}</div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Tytuł grupy"
                                    value={groupTitle}
                                    onChange={e => setGroupTitle(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Szukaj uczestników..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                                <ul className="chat-user-list">
                                    {relatedUsers.map(u => (
                                        <li
                                            key={u.id}
                                            onClick={() => toggleParticipant(u.id)}
                                            style={{
                                                background: selectedParticipants.includes(u.id)
                                                    ? 'var(--accent-bg)'
                                                    : undefined,
                                            }}
                                        >
                                            <strong>{u.fullName}</strong>
                                            {selectedParticipants.includes(u.id) && ' ✓'}
                                        </li>
                                    ))}
                                </ul>
                                <button className="chat-btn chat-btn-primary" onClick={handleCreateGroup}>
                                    Utwórz grupę ({selectedParticipants.length} uczestników)
                                </button>
                            </>
                        )}

                        <button
                            className="chat-btn"
                            style={{ marginTop: '12px', width: '100%' }}
                            onClick={() => setShowNewChatModal(false)}
                        >
                            Anuluj
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
