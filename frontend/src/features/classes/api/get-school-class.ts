import type { SchoolClassResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchSchoolClass(
  classId: number,
): Promise<SchoolClassResponseDTO> {
  const { data } = await api.get<SchoolClassResponseDTO>(
    `/school-classes/${classId}`,
  );
  return data;
}
