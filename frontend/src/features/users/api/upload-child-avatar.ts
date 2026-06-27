import { api } from "@/lib/api";

export async function uploadChildAvatar(
  childId: number,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/children/${childId}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
