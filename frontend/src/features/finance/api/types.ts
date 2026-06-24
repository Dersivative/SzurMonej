export interface AmountRequestDTO {
  amount: number;
}

export interface TransferToFundraiserRequestDTO {
  fundraiserId: number;
  childId: number;
  note?: string;
}

export interface TransferToUserRequestDTO {
  targetUserId?: number;
  targetAccountNumber?: string;
  amount: number;
  note?: string;
}

export interface MoneyOperationResponseDTO {
  sourceAccountId: number;
  sourceBalance: number;
  targetAccountId?: number | null;
  targetBalance?: number | null;
  contributionId?: number | null;
}

export interface AccountLookupResponseDTO {
  userId: number;
  fullName: string;
  accountNumber: string;
}

export interface RecipientValue {
  userId: number | null;
  fullName: string;
  accountNumber: string;
}
