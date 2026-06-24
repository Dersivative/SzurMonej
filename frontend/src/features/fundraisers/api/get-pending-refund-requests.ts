import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import { api } from "@/lib/api";

export async function fetchPendingRefundRequests(
  fundraiserId: number,
): Promise<RefundRequestResponseDTO[]> {
  const { data } = await api.get<RefundRequestResponseDTO[]>(
    `/fundraisers/${fundraiserId}/refund-requests`,
  );
  return data;
}
