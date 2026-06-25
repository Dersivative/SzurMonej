import { api } from "@/lib/api";

export async function uploadAttachment(
  historyId: number,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  await api.post(`/attachments/upload/${historyId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
