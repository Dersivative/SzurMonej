export interface RefundRequestResponseDTO {
  id: number;
  amount: number;
  status: string;
  requestedAt: string;
  requester: {
    fullName: string;
  };
  participant: {
    child: {
      name: string;
      surname: string;
    };
  };
}

export interface RefundRequestListItemDTO extends RefundRequestResponseDTO {
  fundraiserId: number;
  fundraiserTitle: string;
  classLabel?: string | null;
}
