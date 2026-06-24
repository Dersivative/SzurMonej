import type { ChildFundraisersViewDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function fetchFundraisersForChild(
  childId: number,
): Promise<ChildFundraisersViewDTO> {
  const { data } = await api.get<ChildFundraisersViewDTO>(
    `/users/me/children/${childId}/fundraisers`,
  );
  return data;
}
