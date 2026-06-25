import type {
  FundraiserResponseDTO,
  ParticipantResponseDTO,
} from "@/features/fundraisers/api/types";
import type { FundraiserHistoryEntryDTO } from "@/features/fundraisers/api/types-history";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import type { ChildResponseDTO } from "@/features/users/api/types";
import { isParticipantUnpaid } from "@/features/finance/lib/fundraiser-payment";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function participantMatchesRefundRequest(
  participant: ParticipantResponseDTO,
  request: RefundRequestResponseDTO,
): boolean {
  const childName =
    participant.childFirstName ??
    participant.childName.split(" ")[0] ??
    participant.childName;

  return (
    request.participant.child.name === childName &&
    request.participant.child.surname === participant.childSurname
  );
}

function childMatchesRefundRequest(
  child: Pick<ChildResponseDTO, "name" | "surname">,
  request: RefundRequestResponseDTO,
): boolean {
  return (
    request.participant.child.name === child.name &&
    request.participant.child.surname === child.surname
  );
}

export function didUserPayForParticipant(
  participant: ParticipantResponseDTO,
  userFullName: string,
  history: FundraiserHistoryEntryDTO[] = [],
): boolean {
  const childFullName = normalizeName(participant.childName);
  const userName = normalizeName(userFullName);

  return history.some((entry) => {
    if (normalizeName(entry.payerName ?? "") !== userName) {
      return false;
    }

    const isContribution =
      entry.type === "Wpłata rodzica" || entry.type.toLowerCase().includes("wpłata");

    if (!isContribution) {
      return false;
    }

    if (entry.payeeName && normalizeName(entry.payeeName) === childFullName) {
      return true;
    }

    return normalizeName(entry.description).includes(childFullName);
  });
}

function hasPendingRefundForParticipant(
  participant: ParticipantResponseDTO,
  pendingRefundRequests: RefundRequestResponseDTO[] = [],
): boolean {
  return pendingRefundRequests.some(
    (request) =>
      request.status === "PENDING" &&
      participantMatchesRefundRequest(participant, request),
  );
}

export function canUserRequestRefundForParticipant(
  fundraiser: FundraiserResponseDTO,
  participant: ParticipantResponseDTO,
  userFullName: string,
  history: FundraiserHistoryEntryDTO[] = [],
  pendingRefundRequests: RefundRequestResponseDTO[] = [],
): boolean {
  if (fundraiser.status !== "ACTIVE") {
    return false;
  }

  if (isParticipantUnpaid(fundraiser, participant)) {
    return false;
  }

  if ((participant.totalContribution ?? 0) <= 0) {
    return false;
  }

  if (!didUserPayForParticipant(participant, userFullName, history)) {
    return false;
  }

  return !hasPendingRefundForParticipant(participant, pendingRefundRequests);
}

export interface RefundableChildOption {
  childId: number;
  childName: string;
  childSurname: string;
  netContribution: number;
}

export function getRefundableChildrenForParent(
  fundraiser: FundraiserResponseDTO,
  myChildren: ChildResponseDTO[],
  pendingRefundRequests: RefundRequestResponseDTO[] = [],
): RefundableChildOption[] {
  const participants = fundraiser.participants ?? [];
  const myChildIds = new Set(myChildren.map((child) => child.id));
  const pendingRefunds = pendingRefundRequests.filter(
    (request) => request.status === "PENDING",
  );

  return participants
    .filter((participant) => {
      if (
        !myChildIds.has(participant.childId) ||
        (participant.totalContribution ?? 0) <= 0
      ) {
        return false;
      }

      const child = myChildren.find((item) => item.id === participant.childId);
      if (!child) {
        return false;
      }

      return !pendingRefunds.some((request) =>
        childMatchesRefundRequest(child, request),
      );
    })
    .map((participant) => ({
      childId: participant.childId,
      childName: participant.childFirstName ?? participant.childName,
      childSurname: participant.childSurname,
      netContribution: participant.totalContribution ?? 0,
    }));
}

export function canParentRequestRefund(
  fundraiser: FundraiserResponseDTO,
  myChildren: ChildResponseDTO[],
  pendingRefundRequests: RefundRequestResponseDTO[] = [],
): boolean {
  return (
    fundraiser.status === "ACTIVE" &&
    getRefundableChildrenForParent(
      fundraiser,
      myChildren,
      pendingRefundRequests,
    ).length > 0
  );
}

export function getParticipantNetContribution(
  participant: ParticipantResponseDTO,
): number {
  return participant.totalContribution ?? 0;
}
