import type { SchoolClassApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function rejectClassApplication(
  applicationId: number,
): Promise<SchoolClassApplicationResponseDTO> {
  const { data } = await api.post<SchoolClassApplicationResponseDTO>(
    `/school-class-applications/${applicationId}/reject`,
  );
  return data;
}
