import { api } from "@/lib/api";

export async function approveRefundRequest(requestId: number): Promise<void> {
  await api.post(`/refund-requests/${requestId}/approve`);
}
