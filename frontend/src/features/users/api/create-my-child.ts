import type {
  ChildCreateRequestDTO,
  ChildResponseDTO,
} from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function createMyChild(
  request: ChildCreateRequestDTO,
): Promise<ChildResponseDTO> {
  const { data } = await api.post<ChildResponseDTO>(
    "/users/me/children",
    request,
  );
  return data;
}
