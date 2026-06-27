import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapUserResponse } from "@/features/auth/lib/map-user";
import { useAuthStore } from "@/features/auth/store/authStore";
import { formatMoney } from "@/features/finance/lib/format-money";
import { parseAmount, validateAmount } from "@/features/finance/lib/parse-amount";
import { depositToFundraiser } from "@/features/fundraisers/api/deposit-to-fundraiser";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { uploadAttachment } from "@/features/fundraisers/api/upload-attachment";
import { withdrawFromFundraiser } from "@/features/fundraisers/api/withdraw-from-fundraiser";
import {
  getFundraiserAvailableBalance,
  getTreasurerWithdrawalEntries,
} from "@/features/fundraisers/lib/fundraiser-history";
import { fetchUserMe } from "@/features/users/api/get-me";

const fundraiserInputClassName =
  "h-10 border-0 bg-muted text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base";
const INSUFFICIENT_TREASURER_FUNDS_MESSAGE =
  "Brak wystarczających środków na koncie skarbnika. Doładuj konto i spróbuj ponownie.";

interface FundraiserServiceDialogProps {
  fundraiser: FundraiserResponseDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const resolveInsufficientFundsMessage = (message: string): string => {
    if (message.toLowerCase().includes("insufficient funds on account")) {
      return INSUFFICIENT_TREASURER_FUNDS_MESSAGE;
    }
    return message;
  };

  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return resolveInsufficientFundsMessage(data);
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return resolveInsufficientFundsMessage(data.message);
    }
  }

  if (error instanceof Error && error.message) {
    return resolveInsufficientFundsMessage(error.message);
  }

  return fallback;
}

function invalidateFundraiserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
) {
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["auth-me"] });
  queryClient.invalidateQueries({ queryKey: ["user-me"] });
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-details", fundraiserId],
  });
}

async function uploadWithdrawalAttachment(
  fundraiserId: number,
  file: File,
  previousWithdrawalIds: Set<number>,
): Promise<void> {
  const details = await fetchFundraiserDetails(fundraiserId);
  const newEntry = getTreasurerWithdrawalEntries(details.history).find(
    (entry) => !previousWithdrawalIds.has(entry.id),
  );

  if (!newEntry) {
    throw new Error("Nie udało się znaleźć nowej wypłaty do podpięcia pliku.");
  }

  await uploadAttachment(newEntry.id, file);
}

export function FundraiserServiceDialog({
  fundraiser,
  open,
  onOpenChange,
}: FundraiserServiceDialogProps) {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const withdrawFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("Wpłata skarbnika");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawFile, setWithdrawFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: fundraiserDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fundraiser-details", fundraiser.id],
    queryFn: () => fetchFundraiserDetails(fundraiser.id),
    enabled: open,
  });

  const availableBalance = useMemo(
    () => getFundraiserAvailableBalance(fundraiserDetails?.history ?? []),
    [fundraiserDetails?.history],
  );

  const resetForms = () => {
    setDepositAmount("");
    setDepositNote("Wpłata skarbnika");
    setWithdrawAmount("");
    setWithdrawNote("");
    setWithdrawFile(null);
    setActionError(null);
    if (withdrawFileInputRef.current) {
      withdrawFileInputRef.current.value = "";
    }
  };

  const depositMutation = useMutation({
    mutationFn: () => {
      const parsedAmount = parseAmount(depositAmount);
      if (parsedAmount == null) {
        throw new Error("Podaj prawidłową kwotę.");
      }

      return depositToFundraiser(fundraiser.id, {
        amount: parsedAmount,
        note: depositNote.trim() || "Wpłata skarbnika",
      });
    },
    onSuccess: async () => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      invalidateFundraiserQueries(queryClient, fundraiser.id);
      setDepositAmount("");
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        getErrorMessage(error, "Nie udało się wpłacić środków na zbiórkę."),
      );
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseAmount(withdrawAmount);
      if (parsedAmount == null) {
        throw new Error("Podaj prawidłową kwotę.");
      }

      const previousWithdrawalIds = new Set(
        getTreasurerWithdrawalEntries(fundraiserDetails?.history ?? []).map(
          (entry) => entry.id,
        ),
      );

      await withdrawFromFundraiser(fundraiser.id, {
        amount: parsedAmount,
        note: withdrawNote.trim() || "Wypłata ze zbiórki",
      });

      if (withdrawFile) {
        await uploadWithdrawalAttachment(
          fundraiser.id,
          withdrawFile,
          previousWithdrawalIds,
        );
      }
    },
    onSuccess: async () => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      invalidateFundraiserQueries(queryClient, fundraiser.id);
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawFile(null);
      if (withdrawFileInputRef.current) {
        withdrawFileInputRef.current.value = "";
      }
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        getErrorMessage(error, "Nie udało się wypłacić środków ze zbiórki."),
      );
    },
  });

  const isActionPending = depositMutation.isPending || withdrawMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isActionPending) {
      if (!nextOpen) {
        resetForms();
        setActiveTab("deposit");
      }
      onOpenChange(nextOpen);
    }
  };

  const handleDepositSubmit = () => {
    const amountError = validateAmount(depositAmount);
    if (amountError) {
      setActionError(amountError);
      return;
    }

    setActionError(null);
    depositMutation.mutate();
  };

  const handleWithdrawSubmit = () => {
    const amountError = validateAmount(withdrawAmount);
    if (amountError) {
      setActionError(amountError);
      return;
    }

    const parsedAmount = parseAmount(withdrawAmount);
    if (parsedAmount != null && parsedAmount > availableBalance) {
      setActionError("Kwota przekracza dostępne saldo zbiórki.");
      return;
    }

    setActionError(null);
    withdrawMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Obsługa zbiórki — {fundraiser.title}</DialogTitle>
        </DialogHeader>

        {!isError && (
          <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Moje saldo</p>
              <p className="text-base font-semibold">
                {formatMoney(user?.balance ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Saldo zbiórki</p>
              <p className="text-base font-semibold">
                {isLoading ? "—" : formatMoney(availableBalance)}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Nie udało się pobrać danych zbiórki.
          </p>
        )}

        {!isLoading && !isError && (
          <div className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "deposit" | "withdraw")
              }
              className="gap-3"
            >
              <TabsList className="bg-emerald-50 text-emerald-800">
                <TabsTrigger
                  value="deposit"
                  className="hover:bg-emerald-100 hover:text-emerald-900 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                >
                  Wpłata skarbnika
                </TabsTrigger>
                <TabsTrigger
                  value="withdraw"
                  className="hover:bg-emerald-100 hover:text-emerald-900 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                >
                  Wypłata skarbnika
                </TabsTrigger>
              </TabsList>

              <div className="min-h-104">
                <TabsContent value="deposit" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Wpłata skarbnika</CardTitle>
                    <CardDescription>
                      Środki zostaną przelane z Twojego konta na konto zbiórki.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-deposit-amount">Kwota (PLN)</Label>
                      <Input
                        id="service-deposit-amount"
                        type="text"
                        inputMode="decimal"
                        value={depositAmount}
                        onChange={(event) =>
                          setDepositAmount(event.target.value)
                        }
                        className={fundraiserInputClassName}
                        disabled={isActionPending}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-deposit-note">Opis</Label>
                      <Input
                        id="service-deposit-note"
                        value={depositNote}
                        onChange={(event) => setDepositNote(event.target.value)}
                        className={fundraiserInputClassName}
                        disabled={isActionPending}
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={isActionPending || depositAmount.trim() === ""}
                      onClick={handleDepositSubmit}
                    >
                      {depositMutation.isPending
                        ? "Wpłacanie..."
                        : "Wpłać na zbiórkę"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="withdraw" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Wypłata skarbnika</CardTitle>
                    <CardDescription>
                      Środki trafią na Twoje konto skarbnika. Możesz od razu
                      podpiąć dowód wypłaty.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-withdraw-amount">Kwota (PLN)</Label>
                      <Input
                        id="service-withdraw-amount"
                        type="text"
                        inputMode="decimal"
                        value={withdrawAmount}
                        onChange={(event) =>
                          setWithdrawAmount(event.target.value)
                        }
                        className={fundraiserInputClassName}
                        disabled={isActionPending}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-withdraw-note">
                        Opis (opcjonalnie)
                      </Label>
                      <Input
                        id="service-withdraw-note"
                        value={withdrawNote}
                        onChange={(event) => setWithdrawNote(event.target.value)}
                        className={fundraiserInputClassName}
                        disabled={isActionPending}
                        placeholder="np. Zakup materiałów"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-withdraw-file">
                        Załącznik (opcjonalnie)
                      </Label>
                      <input
                        id="service-withdraw-file"
                        ref={withdrawFileInputRef}
                        type="file"
                        className="sr-only"
                        disabled={isActionPending}
                        onChange={(event) =>
                          setWithdrawFile(event.target.files?.[0] ?? null)
                        }
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isActionPending}
                          onClick={() => withdrawFileInputRef.current?.click()}
                        >
                          Wybierz plik
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {withdrawFile
                            ? `Wybrany plik: ${withdrawFile.name}`
                            : "Nie wybrano pliku"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      disabled={isActionPending || withdrawAmount.trim() === ""}
                      onClick={handleWithdrawSubmit}
                    >
                      {withdrawMutation.isPending
                        ? "Wypłacanie..."
                        : "Wypłać ze zbiórki"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              </div>
            </Tabs>

            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isActionPending}
            onClick={() => handleOpenChange(false)}
          >
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
