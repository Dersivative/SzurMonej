import type { EnrollmentApplicationResponseDTO } from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function fetchMyEnrollmentApplications(): Promise<
  EnrollmentApplicationResponseDTO[]
> {
  const { data } = await api.get<EnrollmentApplicationResponseDTO[]>(
    "/users/me/enrollment-applications",
  );
  return data;
}
