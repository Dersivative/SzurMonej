import type { EnrollmentApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export interface SubmitEnrollmentApplicationRequestDTO {
  childId: number;
}

export async function submitEnrollmentApplication(
  token: string,
  request: SubmitEnrollmentApplicationRequestDTO,
): Promise<EnrollmentApplicationResponseDTO> {
  const { data } = await api.post<EnrollmentApplicationResponseDTO>(
    `/enrollment-links/${token}/applications`,
    request,
  );
  return data;
}
