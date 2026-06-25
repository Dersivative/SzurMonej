import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/logout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { formatMoney } from "@/features/finance/lib/format-money";
import { navLinkInactiveClassName } from "@/lib/nav-link";
import { cn } from "@/lib/utils";

export function TopBar() {
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
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between bg-card px-8 ring-1 ring-foreground/10">
      {user && (
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-muted-foreground">
            Saldo:{" "}
            <span className="font-medium text-foreground">
              {formatMoney(user.balance)}
            </span>
          </span>
        </div>
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
    </header>
  );
}
