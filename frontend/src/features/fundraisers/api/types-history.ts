export interface FundraiserHistoryEntryDTO {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  hasAttachment: boolean;
  payerName?: string | null;
  payeeName?: string | null;
}
