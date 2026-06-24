import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import { api } from "@/lib/api";

export async function createRefundRequest(
  fundraiserId: number,
  childId: number,
): Promise<RefundRequestResponseDTO> {
  const { data } = await api.post<RefundRequestResponseDTO>(
    `/fundraisers/${fundraiserId}/children/${childId}/refund-requests`,
  );
  return data;
}
