import type { LoginRequestDTO } from "@/features/auth/api/types";
import { fetchMe } from "@/features/auth/api/get-me";
import type { User } from "@/features/auth/store/authStore";
import { api } from "@/lib/api";

export async function login(credentials: LoginRequestDTO): Promise<User> {
  await api.post(
    "/login",
    new URLSearchParams({
      email: credentials.email,
      password: credentials.password,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  return fetchMe();
}
