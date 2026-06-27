import type { UserResponseDTO } from "@/features/auth/api/types";
import { api } from "@/lib/api";

export async function uploadUserAvatar(file: File): Promise<UserResponseDTO> {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.post<UserResponseDTO>(
    "/users/me/avatar",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}
