import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquarePlus, X } from "lucide-react";
import * as chatApi from "@/api/chatApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/features/auth/store/authStore";
import { cn } from "@/lib/utils";
import type {
  ChatDetails,
  ChatMessage,
  ChatSummary,
  ChatType,
  ChatUser,
} from "@/types/chat";

const POLL_INTERVAL_MS = 3000;

const TYPE_LABELS: Record<ChatType, string> = {
  DIRECT: "Prywatny",
  CLASS: "Klasa",
  FUNDRAISER: "Zbiórka",
  GROUP: "Grupa",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function chatDisplayTitle(chat: ChatSummary | ChatDetails): string {
  return chat.contextLabel || chat.title || TYPE_LABELS[chat.type];
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { error?: string } } })
    ?.response?.data?.error;
  return message || fallback;
}

export function ChatPage({ basePath = "/app/chats" }: { basePath?: string }) {
  const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalPurpose, setModalPurpose] = useState<"new" | "add-participant">(
    "new",
  );
  const [modalTab, setModalTab] = useState<"direct" | "group">("direct");
  const [relatedUsers, setRelatedUsers] = useState<ChatUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(
    [],
  );
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);

  const selectedChatId = chatIdParam ? Number(chatIdParam) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChats = useCallback(async () => {
    try {
      const data = await chatApi.listChats();
      setChats(data);
    } catch {
      setError("Nie udało się załadować listy czatów.");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadChat = useCallback(async (chatId: number) => {
    try {
      const data = await chatApi.getChat(chatId);
      setActiveChat(data);
    } catch {
      setError("Nie udało się załadować czatu.");
    }
  }, []);

  const loadInitialMessages = useCallback(async (chatId: number) => {
    setLoadingMessages(true);
    try {
      const data = await chatApi.getMessages(chatId, { limit: 50 });
      setMessages(data);
      lastMessageIdRef.current =
        data.length > 0 ? data[data.length - 1].id : null;
      setTimeout(scrollToBottom, 50);
    } catch {
      setError("Nie udało się załadować wiadomości.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const pollMessages = useCallback(
    async (chatId: number) => {
      const afterId = lastMessageIdRef.current;
      if (afterId === null) return;

      try {
        const newMessages = await chatApi.getMessages(chatId, {
          afterId,
          limit: 50,
        });
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
          lastMessageIdRef.current = newMessages[newMessages.length - 1].id;
          setTimeout(scrollToBottom, 50);
          loadChats();
        }
      } catch {
        // polling errors are silent
      }
    },
    [loadChats],
  );

  useEffect(() => {
    loadChats();
  }, [loadChats]);

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

    const interval = setInterval(
      () => pollMessages(selectedChatId),
      POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [selectedChatId, pollMessages]);

  const openChat = (chatId: number) => {
    navigate(`${basePath}/${chatId}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !messageInput.trim() || sending) return;

    setSending(true);
    try {
      const sent = await chatApi.sendMessage(
        selectedChatId,
        messageInput.trim(),
      );
      setMessages((prev) => [...prev, sent]);
      lastMessageIdRef.current = sent.id;
      setMessageInput("");
      setTimeout(scrollToBottom, 50);
      loadChats();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się wysłać wiadomości."));
    } finally {
      setSending(false);
    }
  };

  const loadRelatedUsers = useCallback(
    async (query: string, excludeChatId?: number) => {
      try {
        const users = await chatApi.searchRelatedUsers(
          query || undefined,
          excludeChatId,
        );
        setRelatedUsers(users);
      } catch {
        setRelatedUsers([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!showNewChatModal) return;
    const timer = setTimeout(() => {
      loadRelatedUsers(
        userSearch,
        modalPurpose === "add-participant"
          ? (selectedChatId ?? undefined)
          : undefined,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [
    showNewChatModal,
    userSearch,
    modalPurpose,
    selectedChatId,
    loadRelatedUsers,
  ]);

  const resetNewChatModal = () => {
    setUserSearch("");
    setGroupTitle("");
    setSelectedParticipants([]);
    setModalTab("direct");
    setModalPurpose("new");
  };

  const handleNewChatOpenChange = (open: boolean) => {
    if (!open) {
      resetNewChatModal();
    }
    setShowNewChatModal(open);
  };

  const handleStartDirect = async (targetUserId: number) => {
    try {
      const chat = await chatApi.createDirectChat(targetUserId);
      handleNewChatOpenChange(false);
      await loadChats();
      openChat(chat.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się utworzyć czatu."));
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      setError("Podaj tytuł grupy.");
      return;
    }
    try {
      const chat = await chatApi.createGroupChat(
        groupTitle.trim(),
        selectedParticipants,
      );
      handleNewChatOpenChange(false);
      await loadChats();
      openChat(chat.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się utworzyć grupy."));
    }
  };

  const toggleParticipant = (userId: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAddParticipant = async (userId: number) => {
    if (!selectedChatId) return;
    try {
      await chatApi.addParticipant(selectedChatId, userId);
      await loadChat(selectedChatId);
      setUserSearch("");
      handleNewChatOpenChange(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się dodać uczestnika."));
    }
  };

  const handleRemoveParticipant = async (userId: number) => {
    if (!selectedChatId) return;
    if (!window.confirm("Usunąć uczestnika z grupy?")) return;
    try {
      await chatApi.removeParticipant(selectedChatId, userId);
      if (userId === user?.id) {
        navigate(basePath);
        await loadChats();
        return;
      }
      await loadChat(selectedChatId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się usunąć uczestnika."));
    }
  };

  const openAddParticipantModal = () => {
    setModalPurpose("add-participant");
    setModalTab("group");
    setShowNewChatModal(true);
    loadRelatedUsers("", selectedChatId ?? undefined);
  };

  const openNewChatModal = () => {
    setModalPurpose("new");
    setModalTab("direct");
    setShowNewChatModal(true);
  };

  const isAddingToExistingGroup = modalPurpose === "add-participant";

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4">
      <Card className="flex w-80 shrink-0 flex-col py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Czaty</CardTitle>
          <CardAction>
            <Button
              type="button"
              size="sm"
              onClick={openNewChatModal}
            >
              <MessageSquarePlus className="size-4" />
              Nowy
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">
            {loadingChats ? (
              <p className="p-4 text-muted-foreground">Ładowanie...</p>
            ) : chats.length === 0 ? (
              <p className="p-4 text-muted-foreground">
                Brak czatów. Utwórz nową rozmowę.
              </p>
            ) : (
              <ul className="flex flex-col">
                {chats.map((chat) => {
                  const isActive = selectedChatId === chat.id;
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        onClick={() => openChat(chat.id)}
                        className={cn(
                          "w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                          isActive && "bg-active",
                        )}
                      >
                        <Badge variant="secondary" className="mb-1.5">
                          {TYPE_LABELS[chat.type]}
                        </Badge>
                        <div className="truncate font-medium">
                          {chatDisplayTitle(chat)}
                        </div>
                        {chat.lastMessage && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            <span className="font-medium">
                              {chat.lastMessage.sender.fullName}:
                            </span>{" "}
                            {chat.lastMessage.content}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex min-w-0 flex-1 flex-col py-0">
        {!selectedChatId ? (
          <CardContent className="flex flex-1 items-center justify-center">
            <CardDescription className="text-base">
              Wybierz czat z listy lub utwórz nowy.
            </CardDescription>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b py-4">
              {activeChat ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {TYPE_LABELS[activeChat.type]}
                    </Badge>
                    <CardTitle>{chatDisplayTitle(activeChat)}</CardTitle>
                  </div>
                  {activeChat.type === "GROUP" && (
                    <div className="col-span-2 mt-2 flex flex-wrap items-center gap-2">
                      {activeChat.participants.map((participant) => (
                        <Badge
                          key={participant.id}
                          variant="outline"
                          className="gap-1 pr-1"
                        >
                          {participant.fullName}
                          <button
                            type="button"
                            title="Usuń"
                            className="rounded-full p-0.5 hover:bg-muted"
                            onClick={() =>
                              handleRemoveParticipant(participant.id)
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openAddParticipantModal}
                      >
                        + Dodaj
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <CardTitle>Ładowanie...</CardTitle>
              )}
            </CardHeader>

            {error && (
              <div className="border-b px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea className="h-full px-4 py-4">
                {loadingMessages ? (
                  <p className="text-muted-foreground">
                    Ładowanie wiadomości...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-muted-foreground">
                    Brak wiadomości. Napisz pierwszą!
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((msg) => {
                      const isOwn = msg.sender.id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[75%] rounded-xl px-3 py-2",
                            isOwn
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          {!isOwn && (
                            <div className="mb-0.5 text-xs font-medium opacity-80">
                              {msg.sender.fullName}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <div
                            className={cn(
                              "mt-1 text-xs opacity-70",
                              isOwn ? "text-right" : "text-left",
                            )}
                          >
                            {formatTime(msg.sentAt)}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            <CardFooter className="border-t">
              <form
                className="flex w-full gap-2"
                onSubmit={handleSend}
              >
                <Input
                  type="text"
                  placeholder="Napisz wiadomość..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  maxLength={2000}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                >
                  Wyślij
                </Button>
              </form>
            </CardFooter>
          </>
        )}
      </Card>

      <Dialog open={showNewChatModal} onOpenChange={handleNewChatOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAddingToExistingGroup
                ? "Dodaj uczestnika"
                : "Nowa rozmowa"}
            </DialogTitle>
            <DialogDescription>
              {isAddingToExistingGroup
                ? "Wybierz użytkownika powiązanego z Twoją klasą."
                : "Rozpocznij rozmowę prywatną lub utwórz grupę."}
            </DialogDescription>
          </DialogHeader>

          {!isAddingToExistingGroup && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={modalTab === "direct" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setModalTab("direct")}
              >
                Wiadomość prywatna
              </Button>
              <Button
                type="button"
                variant={modalTab === "group" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setModalTab("group")}
              >
                Grupa
              </Button>
            </div>
          )}

          {modalTab === "direct" && !isAddingToExistingGroup ? (
            <div className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Szukaj po imieniu, nazwisku lub email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <ScrollArea className="max-h-60">
                <ul className="flex flex-col gap-1">
                  {relatedUsers.length === 0 ? (
                    <li className="px-2 py-2 text-sm text-muted-foreground">
                      Brak powiązanych użytkowników.
                    </li>
                  ) : (
                    relatedUsers.map((relatedUser) => (
                      <li key={relatedUser.id}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                          onClick={() => handleStartDirect(relatedUser.id)}
                        >
                          <div className="font-medium">
                            {relatedUser.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {relatedUser.email}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </div>
          ) : isAddingToExistingGroup ? (
            <div className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Szukaj użytkownika do dodania..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <ScrollArea className="max-h-60">
                <ul className="flex flex-col gap-1">
                  {relatedUsers.map((relatedUser) => (
                    <li key={relatedUser.id}>
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                        onClick={() => handleAddParticipant(relatedUser.id)}
                      >
                        <div className="font-medium">
                          {relatedUser.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relatedUser.email}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Tytuł grupy"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Szukaj uczestników..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <ScrollArea className="max-h-48">
                <ul className="flex flex-col gap-1">
                  {relatedUsers.map((relatedUser) => {
                    const selected = selectedParticipants.includes(
                      relatedUser.id,
                    );
                    return (
                      <li key={relatedUser.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-md px-2 py-2 text-left hover:bg-muted",
                            selected && "bg-active",
                          )}
                          onClick={() => toggleParticipant(relatedUser.id)}
                        >
                          <div className="font-medium">
                            {relatedUser.fullName}
                            {selected && " ✓"}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
              <Button type="button" onClick={handleCreateGroup}>
                Utwórz grupę ({selectedParticipants.length} uczestników)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
