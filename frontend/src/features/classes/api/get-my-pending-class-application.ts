import type { SchoolClassApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchMyPendingClassApplication(): Promise<SchoolClassApplicationResponseDTO | null> {
  const { data } = await api.get<SchoolClassApplicationResponseDTO | "">(
    "/school-class-applications/me/pending",
  );

  if (!data || typeof data !== "object") {
    return null;
  }

  return data;
}
