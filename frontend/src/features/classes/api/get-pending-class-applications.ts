import type { SchoolClassApplicationResponseDTO } from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function fetchPendingClassApplications(): Promise<
  SchoolClassApplicationResponseDTO[]
> {
  const { data } = await api.get<SchoolClassApplicationResponseDTO[]>(
    "/school-class-applications",
    { params: { status: "PENDING" } },
  );
  return data;
}
