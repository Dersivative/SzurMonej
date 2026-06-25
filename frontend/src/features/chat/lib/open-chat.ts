import { getOrCreateClassChat, getOrCreateFundraiserChat } from "@/api/chatApi";

export async function openClassChat(classId: number): Promise<number> {
  const chat = await getOrCreateClassChat(classId);
  return chat.id;
}

export async function openFundraiserChat(fundraiserId: number): Promise<number> {
  const chat = await getOrCreateFundraiserChat(fundraiserId);
  return chat.id;
}
