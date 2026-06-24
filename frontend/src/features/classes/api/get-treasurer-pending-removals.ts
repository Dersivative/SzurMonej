import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchPendingRefundRequestsForClass } from "@/features/classes/api/get-pending-refund-requests-for-class";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import type { ChildResponseDTO } from "@/features/users/api/types";

export interface TreasurerPendingRemovalItem {
  classId: number;
  classLabel: string;
  membershipId: number;
  child: ChildResponseDTO;
  pendingRefunds: RefundRequestResponseDTO[];
}

function getRefundsForChild(
  child: ChildResponseDTO,
  refunds: RefundRequestResponseDTO[],
): RefundRequestResponseDTO[] {
  return refunds.filter(
    (request) =>
      request.participant.child.name === child.name &&
      request.participant.child.surname === child.surname,
  );
}

export async function fetchTreasurerPendingRemovals(): Promise<
  TreasurerPendingRemovalItem[]
> {
  const classes = await fetchMySchoolClasses();

  const items = await Promise.all(
    classes.map(async (schoolClass) => {
      const pendingChildren = schoolClass.children.filter(
        (child) =>
          child.status === "REMOVAL_PENDING" && child.membershipId != null,
      );

      if (pendingChildren.length === 0) {
        return [];
      }

      const refunds = await fetchPendingRefundRequestsForClass(schoolClass.id);

      return pendingChildren.map((child) => ({
        classId: schoolClass.id,
        classLabel: schoolClass.label,
        membershipId: child.membershipId!,
        child,
        pendingRefunds: getRefundsForChild(child, refunds),
      }));
    }),
  );

  return items.flat();
}
