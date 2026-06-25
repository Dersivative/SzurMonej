import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/features/auth/api/logout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { navLinkInactiveClassName } from "@/lib/nav-link";
import { cn } from "@/lib/utils";

export function AdminTopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);

  const { mutate, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: ["auth-me"] });
      navigate("/login", { replace: true });
    },
  });

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">Administrator</Badge>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-muted-foreground">{user.email}</span>
        )}
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
      </div>
    </header>
  );
}
