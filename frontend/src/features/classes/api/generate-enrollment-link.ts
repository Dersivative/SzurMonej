import type { EnrollmentLinkResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function generateEnrollmentLink(
  classId: number,
): Promise<EnrollmentLinkResponseDTO> {
  const { data } = await api.post<EnrollmentLinkResponseDTO>(
    `/school-classes/${classId}/enrollment-link`,
  );
  return data;
}
