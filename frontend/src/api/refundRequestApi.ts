import axios from 'axios';

export interface RefundRequest {
    id: number;
    participant: {
        child: {
            name: string;
            surname: string;
        };
    };
    requester: {
        fullName: string;
    };
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
}

export const getPendingRefundRequests = async (fundraiserId: number): Promise<RefundRequest[]> => {
    const response = await axios.get(`/api/fundraisers/${fundraiserId}/refund-requests`);
    return response.data;
};

export const createRefundRequest = async (fundraiserId: number, childId: number): Promise<RefundRequest> => {
    const response = await axios.post(`/api/fundraisers/${fundraiserId}/children/${childId}/refund-requests`);
    return response.data;
};

export const approveRefundRequest = async (requestId: number): Promise<void> => {
    await axios.post(`/api/refund-requests/${requestId}/approve`);
};

export const rejectRefundRequest = async (requestId: number): Promise<void> => {
    await axios.post(`/api/refund-requests/${requestId}/reject`);
};
