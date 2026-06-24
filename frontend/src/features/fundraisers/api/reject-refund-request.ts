import { api } from "@/lib/api";

export async function rejectRefundRequest(requestId: number): Promise<void> {
  await api.post(`/refund-requests/${requestId}/reject`);
}
