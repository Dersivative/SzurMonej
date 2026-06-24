import { fetchMySchoolClasses } from "@/features/classes/api/get-my-school-classes";
import { fetchFundraisersForClass } from "@/features/fundraisers/api/get-fundraisers-for-class";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";
import type { RefundRequestListItemDTO } from "@/features/fundraisers/api/types-refund";

export async function fetchTreasurerPendingRefundRequests(): Promise<
  RefundRequestListItemDTO[]
> {
  const classes = await fetchMySchoolClasses();
  const items: RefundRequestListItemDTO[] = [];
  const seenIds = new Set<number>();

  for (const schoolClass of classes) {
    const fundraisers = await fetchFundraisersForClass(schoolClass.id);

    for (const fundraiser of fundraisers) {
      const requests = await fetchPendingRefundRequests(fundraiser.id);

      for (const request of requests) {
        if (request.status !== "PENDING" || seenIds.has(request.id)) {
          continue;
        }

        seenIds.add(request.id);
        items.push({
          ...request,
          fundraiserId: fundraiser.id,
          fundraiserTitle: fundraiser.title,
          classLabel: schoolClass.label,
        });
      }
    }
  }

  return items.sort((left, right) =>
    right.requestedAt.localeCompare(left.requestedAt),
  );
}
