import { fetchMyChildren } from "@/features/users/api/get-my-children";
import type { ChildResponseDTO } from "@/features/users/api/types";

export interface MyPendingRemovalItem {
  classId: number;
  classLabel: string;
  membershipId: number;
  child: ChildResponseDTO;
}

export async function fetchMyPendingRemovals(): Promise<MyPendingRemovalItem[]> {
  const children = await fetchMyChildren();

  return children
    .filter(
      (child) =>
        child.status === "REMOVAL_PENDING" &&
        child.schoolClassId != null &&
        child.membershipId != null,
    )
    .map((child) => ({
      classId: child.schoolClassId!,
      classLabel: child.schoolClassName ?? "",
      membershipId: child.membershipId!,
      child,
    }));
}
