import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { fetchMe } from "@/features/auth/api/get-me";
import { useAuthStore } from "@/features/auth/store/authStore";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: fetchMe,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setAuth(data);
    } else if (isError) {
      clearAuth();
    }
  }, [data, isError, setAuth, clearAuth]);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-muted-foreground text-sm tracking-tight">
        Weryfikacja bezpiecznego połączenia...
      </div>
    );
  }

  return <>{children}</>;
}
