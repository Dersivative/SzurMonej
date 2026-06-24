import type { EnrollmentApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function rejectEnrollmentApplication(
  classId: number,
  applicationId: number,
): Promise<EnrollmentApplicationResponseDTO> {
  const { data } = await api.post<EnrollmentApplicationResponseDTO>(
    `/school-classes/${classId}/enrollment-applications/${applicationId}/reject`,
  );
  return data;
}
