import type { EnrollmentLinkResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchEnrollmentLink(
  classId: number,
): Promise<EnrollmentLinkResponseDTO> {
  const { data } = await api.get<EnrollmentLinkResponseDTO>(
    `/school-classes/${classId}/enrollment-link`,
  );
  return data;
}
