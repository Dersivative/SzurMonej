import type { SchoolClassApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function approveClassApplication(
  applicationId: number,
): Promise<SchoolClassApplicationResponseDTO> {
  const { data } = await api.post<SchoolClassApplicationResponseDTO>(
    `/school-class-applications/${applicationId}/approve`,
  );
  return data;
}
