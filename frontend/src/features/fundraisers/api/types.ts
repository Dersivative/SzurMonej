import type { UserResponseDTO } from "@/features/auth/api/types";
import type { TreasurerResponseDTO } from "@/features/classes/api/types";
import type { ChildResponseDTO } from "@/features/users/api/types";
import type { FundraiserHistoryEntryDTO } from "@/features/fundraisers/api/types-history";

export type FundraiserStatus = "ACTIVE" | "RECONCILING" | "FINISHED";
export type FundraiserType = "TOTAL_GOAL" | "PER_CHILD_GOAL";

export interface ContributionSummaryDTO {
  paidAt: string;
  amount: number;
}

export interface ParticipantResponseDTO {
  childId: number;
  childName: string;
  childFirstName: string;
  childSurname: string;
  totalContribution: number;
  debt?: number | null;
  credit?: number | null;
  status?: string | null;
  contributions?: ContributionSummaryDTO[];
}

export interface FundraiserResponseDTO {
  id: number;
  title: string;
  description?: string | null;
  goalAmount: number;
  currentAmount?: number | null;
  suggestedContribution?: number | null;
  startedAt: string;
  endedAt?: string | null;
  status: FundraiserStatus;
  fundraiserType: FundraiserType;
  perChildAmount?: number | null;
  treasurer?: TreasurerResponseDTO | null;
  classId?: number | null;
  classLabel?: string | null;
  participants?: ParticipantResponseDTO[];
  nonParticipants?: ChildResponseDTO[];
  history?: FundraiserHistoryEntryDTO[];
}

export interface FundraiserCreateRequestDTO {
  title: string;
  description?: string;
  fundraiserType: FundraiserType;
  goalAmount?: number;
  perChildAmount?: number;
  participantIds?: number[];
}

export interface UpdateGoalRequestDTO {
  newGoalAmount: number;
}

export interface UpdateDetailsRequestDTO {
  title?: string;
  description?: string;
}

export interface FundraiserApplicationRequestDTO {
  classId: number;
  title: string;
  description?: string;
  fundraiserType: FundraiserType;
  goalAmount?: number;
  perChildAmount?: number;
  participantIds?: number[];
}

export interface FundraiserApplicationResponseDTO {
  id: number;
  title: string;
  description?: string | null;
  fundraiserType: FundraiserType;
  goalAmount?: number | null;
  perChildAmount?: number | null;
  participantIds?: number[];
  status: string;
  requestedAt?: string | null;
  requestingParent?: UserResponseDTO | null;
}

export interface FundraiserApplicationListItemDTO
  extends FundraiserApplicationResponseDTO {
  classId?: number | null;
  classLabel?: string | null;
}

export interface ChildFundraisersViewDTO {
  activeFundraisers: FundraiserResponseDTO[];
  pendingApplications: FundraiserApplicationResponseDTO[];
}

export interface MyFundraisersResult {
  fundraisers: FundraiserResponseDTO[];
  pendingApplications: FundraiserApplicationListItemDTO[];
}
