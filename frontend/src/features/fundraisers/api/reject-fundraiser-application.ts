import { api } from "@/lib/api";

export async function rejectFundraiserApplication(
  applicationId: number,
): Promise<void> {
  await api.post(`/fundraiser-applications/${applicationId}/reject`);
}
