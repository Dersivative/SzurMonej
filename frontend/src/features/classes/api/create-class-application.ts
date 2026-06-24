import type {
  SchoolClassApplicationRequestDTO,
  SchoolClassApplicationResponseDTO,
} from "@/features/classes/api/types";
import { api } from "@/lib/api";

export async function createClassApplication(
  request: SchoolClassApplicationRequestDTO,
): Promise<SchoolClassApplicationResponseDTO> {
  const { data } = await api.post<SchoolClassApplicationResponseDTO>(
    "/school-class-applications",
    request,
  );
  return data;
}
