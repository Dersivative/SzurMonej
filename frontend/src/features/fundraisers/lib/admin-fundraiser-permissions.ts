import type { ParticipantResponseDTO } from "@/features/fundraisers/api/types";

export function canRemoveParticipant(
  participant: ParticipantResponseDTO,
  isTreasurer: boolean,
  isAdmin: boolean,
  myChildIds: Set<number>,
): boolean {
  if (participant.status === "REMOVAL_PENDING") {
    return false;
  }

  return isTreasurer || isAdmin || myChildIds.has(participant.childId);
}
