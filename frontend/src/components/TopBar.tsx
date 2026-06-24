import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/logout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { navLinkInactiveClassName } from "@/lib/nav-link";
import { cn } from "@/lib/utils";

export function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { mutate, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: ["auth-me"] });
      navigate("/login", { replace: true });
    },
  });

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between bg-card px-6 ring-1 ring-foreground/10">
      <span className="text-sm font-semibold text-foreground">Skarbnik</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => mutate()}
        className={cn(
          navLinkInactiveClassName,
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isPending ? "Wylogowywanie..." : "Wyloguj"}
      </button>
    </header>
  );
}
