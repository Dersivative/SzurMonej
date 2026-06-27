import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
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
import { withdrawFromOwnAccount } from "@/features/finance/api/withdraw-from-own-account";
import { formatMoney } from "@/features/finance/lib/format-money";
import { parseAmount, validateAmount } from "@/features/finance/lib/parse-amount";
import {
  normalizeBankAccountNumber,
  validateBankAccountNumber,
} from "@/features/finance/lib/validate-bank-account";
import { fetchUserMe } from "@/features/users/api/get-me";
import { updateBankAccount } from "@/features/users/api/update-bank-account";

const inputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";

type FinanceDialog = "deposit" | "withdraw" | null;

export function MyBankAccountCard() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<FinanceDialog>(null);
  const [amount, setAmount] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setBankAccountNumber(user?.bankAccountNumber ?? "");
  }, [user?.bankAccountNumber]);

  const refreshUser = async () => {
    const refreshedUser = await fetchUserMe();
    setAuth(mapUserResponse(refreshedUser));
    queryClient.invalidateQueries({ queryKey: ["user-me"] });
    return refreshedUser;
  };

  const depositMutation = useMutation({
    mutationFn: depositToOwnAccount,
    onSuccess: async (response) => {
      await refreshUser();
      setSuccessMessage(
        `Konto doładowane. Nowe saldo: ${formatMoney(response.sourceBalance)}.`,
      );
      setAmount("");
      setAmountError(null);
      setActiveDialog(null);
    },
    onError: (mutationError) => {
      setAmountError(getErrorMessage(mutationError, "Nie udało się doładować konta."));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawFromOwnAccount,
    onSuccess: async (response) => {
      await refreshUser();
      setSuccessMessage(
        `Wypłata zrealizowana. Nowe saldo: ${formatMoney(response.sourceBalance)}.`,
      );
      setAmount("");
      setAmountError(null);
      setActiveDialog(null);
    },
    onError: (mutationError) => {
      setAmountError(getErrorMessage(mutationError, "Nie udało się wypłacić środków."));
    },
  });

  const bankAccountMutation = useMutation({
    mutationFn: updateBankAccount,
    onSuccess: async (response) => {
      setAuth(mapUserResponse(response));
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      setBankAccountNumber(response.bankAccountNumber ?? "");
      setBankAccountError(null);
      setSuccessMessage("Numer konta bankowego został zapisany.");
    },
    onError: (mutationError) => {
      setBankAccountError(
        getErrorMessage(mutationError, "Nie udało się zapisać numeru konta."),
      );
    },
  });

  if (!user) {
    return null;
  }

  const isDialogPending = depositMutation.isPending || withdrawMutation.isPending;
  const hasBankAccountChanges =
    normalizeBankAccountNumber(bankAccountNumber) !==
    normalizeBankAccountNumber(user.bankAccountNumber ?? "");

  const handleDeposit = () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount == null) {
      setAmountError("Nieprawidłowa kwota.");
      return;
    }

    setAmountError(null);
    depositMutation.mutate(parsedAmount);
  };

  const handleWithdraw = () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount == null) {
      setAmountError("Nieprawidłowa kwota.");
      return;
    }

    if (user.balance != null && parsedAmount > user.balance) {
      setAmountError("Kwota wypłaty nie może przekraczać salda konta.");
      return;
    }

    setAmountError(null);
    withdrawMutation.mutate(parsedAmount);
  };

  const handleSaveBankAccount = () => {
    const normalized = normalizeBankAccountNumber(bankAccountNumber);
    const validationError = validateBankAccountNumber(normalized);
    if (validationError) {
      setBankAccountError(validationError);
      return;
    }

    setBankAccountError(null);
    bankAccountMutation.mutate(normalized);
  };

  const closeDialog = () => {
    if (!isDialogPending) {
      setActiveDialog(null);
      setAmount("");
      setAmountError(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Moje konto bankowe</CardTitle>
          <CardDescription>Saldo, numer konta i operacje na środkach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="bank-account-number">Numer konta bankowego</Label>
            <Input
              id="bank-account-number"
              type="text"
              value={bankAccountNumber}
              onChange={(event) => setBankAccountNumber(event.target.value)}
              placeholder="PL12345678901234567890123456"
              className={inputClassName}
              disabled={bankAccountMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Podaj 26 cyfr lub format PL i 26 cyfr.
            </p>
            {bankAccountError && (
              <p className="text-sm text-destructive">{bankAccountError}</p>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={bankAccountMutation.isPending || !hasBankAccountChanges}
              onClick={handleSaveBankAccount}
            >
              {bankAccountMutation.isPending ? "Zapisywanie..." : "Zapisz numer konta"}
            </Button>
          </div>

          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setActiveDialog("deposit")}>
              Doładuj konto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveDialog("withdraw")}
            >
              Wypłać środki
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={activeDialog === "deposit"}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
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
                {amountError && <p className="text-sm text-destructive">{amountError}</p>}
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

      <AlertDialog
        open={activeDialog === "withdraw"}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wypłać środki</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-left">
                <p className="text-sm text-muted-foreground">
                  Wypłata zmniejszy saldo Twojego konta w aplikacji.
                  {user.bankAccountNumber
                    ? ` Środki zostaną wysłane na konto ${user.bankAccountNumber}.`
                    : " Ustaw numer konta bankowego przed wypłatą."}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Kwota (PLN)</Label>
                  <Input
                    id="withdraw-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="np. 50.00"
                    className={inputClassName}
                    disabled={withdrawMutation.isPending}
                  />
                </div>
                {amountError && <p className="text-sm text-destructive">{amountError}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleWithdraw();
              }}
            >
              {withdrawMutation.isPending ? "Wysyłanie..." : "Wypłać"}
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
