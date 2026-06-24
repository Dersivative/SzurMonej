import type { FundraiserApplicationRequestDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export type ApproveFundraiserApplicationRequestDTO = Omit<
  FundraiserApplicationRequestDTO,
  "classId"
>;

export async function approveFundraiserApplication(
  applicationId: number,
  request: ApproveFundraiserApplicationRequestDTO,
): Promise<void> {
  await api.post(`/fundraiser-applications/${applicationId}/approve`, request);
}
