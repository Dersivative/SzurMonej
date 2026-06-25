import type {
  FundraiserResponseDTO,
  ParticipantResponseDTO,
} from "@/features/fundraisers/api/types";

const EPSILON = 0.01;

export function getParticipantRemainingAmount(
  fundraiser: FundraiserResponseDTO,
  participant: ParticipantResponseDTO,
): number {
  const contributed = participant.totalContribution ?? 0;

  if (fundraiser.fundraiserType === "PER_CHILD_GOAL") {
    const goal = fundraiser.perChildAmount ?? 0;
    return Math.max(0, goal - contributed);
  }

  const participants = fundraiser.participants ?? [];
  const activeCount = Math.max(participants.length, 1);
  const perChildShare = (fundraiser.goalAmount ?? 0) / activeCount;
  return Math.max(0, perChildShare - contributed);
}

export function isParticipantUnpaid(
  fundraiser: FundraiserResponseDTO,
  participant: ParticipantResponseDTO,
): boolean {
  return getParticipantRemainingAmount(fundraiser, participant) > EPSILON;
}

export function getUnpaidParticipants(
  fundraiser: FundraiserResponseDTO,
  childIds?: number[],
): ParticipantResponseDTO[] {
  const participants = fundraiser.participants ?? [];
  const filtered =
    childIds == null
      ? participants
      : participants.filter((participant) =>
          childIds.includes(participant.childId),
        );

  return filtered.filter((participant) =>
    isParticipantUnpaid(fundraiser, participant),
  );
}

export function getMyChildIdsInFundraiser(
  fundraiser: FundraiserResponseDTO,
  myChildIds: number[],
): number[] {
  const participantChildIds = new Set(
    (fundraiser.participants ?? []).map((participant) => participant.childId),
  );

  return myChildIds.filter((childId) => participantChildIds.has(childId));
}

export function partitionParticipants(
  participants: ParticipantResponseDTO[],
  myChildIds: number[],
): {
  mine: ParticipantResponseDTO[];
  others: ParticipantResponseDTO[];
} {
  const myChildIdSet = new Set(myChildIds);

  return {
    mine: participants.filter((participant) =>
      myChildIdSet.has(participant.childId),
    ),
    others: participants.filter(
      (participant) => !myChildIdSet.has(participant.childId),
    ),
  };
}
