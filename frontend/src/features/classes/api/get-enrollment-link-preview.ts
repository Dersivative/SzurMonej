import type { EnrollmentLinkPreviewResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchEnrollmentLinkPreview(
  token: string,
): Promise<EnrollmentLinkPreviewResponseDTO> {
  const { data } = await api.get<EnrollmentLinkPreviewResponseDTO>(
    `/enrollment-links/${token}`,
  );
  return data;
}
