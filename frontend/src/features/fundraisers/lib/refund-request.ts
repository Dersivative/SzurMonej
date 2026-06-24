import type {
  FundraiserResponseDTO,
  ParticipantResponseDTO,
} from "@/features/fundraisers/api/types";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import type { ChildResponseDTO } from "@/features/users/api/types";

function childMatchesRefundRequest(
  child: Pick<ChildResponseDTO, "name" | "surname">,
  request: RefundRequestResponseDTO,
): boolean {
  return (
    request.participant.child.name === child.name &&
    request.participant.child.surname === child.surname
  );
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
