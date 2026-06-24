import { api } from "@/lib/api";

export async function logout(): Promise<void> {
  await api.post("/logout");
}
