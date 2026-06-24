import type { EnrollmentApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchPendingEnrollmentApplications(
  classId: number,
): Promise<EnrollmentApplicationResponseDTO[]> {
  const { data } = await api.get<EnrollmentApplicationResponseDTO[]>(
    `/school-classes/${classId}/enrollment-applications`,
    { params: { status: "PENDING" } },
  );
  return data;
}
