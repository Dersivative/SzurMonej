import type { UserResponseDTO } from "@/features/auth/api/types";
import { mapUserResponse } from "@/features/auth/lib/map-user";
import type { User } from "@/features/auth/store/authStore";
import { api } from "@/lib/api";

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<UserResponseDTO>("/users/me");
  return mapUserResponse(data);
}
