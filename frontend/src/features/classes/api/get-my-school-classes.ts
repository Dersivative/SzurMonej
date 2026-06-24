import type { SchoolClassResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchMySchoolClasses(): Promise<SchoolClassResponseDTO[]> {
  const { data } = await api.get<SchoolClassResponseDTO[]>(
    "/school-classes/my-classes",
  );
  return data;
}
