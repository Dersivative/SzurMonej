import { fetchFundraisersForChild } from "@/features/fundraisers/api/get-fundraisers-for-child";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";
import type { RefundRequestListItemDTO } from "@/features/fundraisers/api/types-refund";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

export async function fetchMyPendingRefundRequests(): Promise<
  RefundRequestListItemDTO[]
> {
  const children = await fetchMyChildren();
  const views = await Promise.all(
    children.map((child) => fetchFundraisersForChild(child.id)),
  );

  const items: RefundRequestListItemDTO[] = [];
  const seenIds = new Set<number>();

  for (const [index, child] of children.entries()) {
    const view = views[index];
    if (!view) {
      continue;
    }

    for (const fundraiser of view.activeFundraisers) {
      const requests = await fetchPendingRefundRequests(fundraiser.id);

      for (const request of requests) {
        if (request.status !== "PENDING" || seenIds.has(request.id)) {
          continue;
        }

        const childMatches =
          request.participant.child.name === child.name &&
          request.participant.child.surname === child.surname;

        if (!childMatches) {
          continue;
        }

        seenIds.add(request.id);
        items.push({
          ...request,
          fundraiserId: fundraiser.id,
          fundraiserTitle: fundraiser.title,
          classLabel: fundraiser.classLabel,
        });
      }
    }
  }

  return items.sort((left, right) =>
    right.requestedAt.localeCompare(left.requestedAt),
  );
}
