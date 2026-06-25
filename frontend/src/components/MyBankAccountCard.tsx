import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapUserResponse } from "@/features/auth/lib/map-user";
import { useAuthStore } from "@/features/auth/store/authStore";
import { depositToOwnAccount } from "@/features/finance/api/deposit-to-own-account";
import { formatMoney } from "@/features/finance/lib/format-money";
import { parseAmount, validateAmount } from "@/features/finance/lib/parse-amount";
import { fetchUserMe } from "@/features/users/api/get-me";

const inputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

export function MyBankAccountCard() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const depositMutation = useMutation({
    mutationFn: depositToOwnAccount,
    onSuccess: async (response) => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      setSuccessMessage(
        `Konto doładowane. Nowe saldo: ${formatMoney(response.sourceBalance)}.`,
      );
      setAmount("");
      setError(null);
      setDialogOpen(false);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się doładować konta."));
    },
  });

  if (!user) {
    return null;
  }

  const handleDeposit = () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount == null) {
      setError("Nieprawidłowa kwota.");
      return;
    }

    setError(null);
    depositMutation.mutate(parsedAmount);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Moje konto bankowe</CardTitle>
          <CardDescription>Saldo i doładowanie środków</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Właściciel konta</p>
              <p className="text-base font-semibold">{user.fullName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Stan konta</p>
              <p className="text-2xl font-semibold">{formatMoney(user.balance)}</p>
            </div>
          </div>

          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}

          <Button type="button" onClick={() => setDialogOpen(true)}>
            Doładuj konto
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!depositMutation.isPending) {
            setDialogOpen(open);
            if (!open) {
              setAmount("");
              setError(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Doładuj konto</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                <p className="text-sm text-muted-foreground">
                  Wpłata trafi na Twoje konto w aplikacji.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Kwota (PLN)</Label>
                  <Input
                    id="deposit-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="np. 100.00"
                    className={inputClassName}
                    disabled={depositMutation.isPending}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={depositMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={depositMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDeposit();
              }}
            >
              {depositMutation.isPending ? "Wysyłanie..." : "Wyślij"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return fallback;
}
