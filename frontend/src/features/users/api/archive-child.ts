import { api } from "@/lib/api";

export async function archiveChild(childId: number): Promise<void> {
  await api.post(`/children/${childId}/archive`);
}
