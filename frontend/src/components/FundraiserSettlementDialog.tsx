import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
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
import { mapUserResponse } from "@/features/auth/lib/map-user";
import { useAuthStore } from "@/features/auth/store/authStore";
import { formatMoney } from "@/features/finance/lib/format-money";
import { partitionParticipants } from "@/features/finance/lib/fundraiser-payment";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { payFundraiserDebt } from "@/features/fundraisers/api/pay-fundraiser-debt";
import type { ParticipantResponseDTO } from "@/features/fundraisers/api/types";
import { fetchUserMe } from "@/features/users/api/get-me";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

interface FundraiserSettlementDialogProps {
  fundraiserId: number;
  fundraiserTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingDebtPay {
  childId: number;
  childName: string;
  amount: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return mapPaymentErrorMessage(data);
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return mapPaymentErrorMessage(data.message);
    }
  }

  if (error instanceof Error && error.message) {
    return mapPaymentErrorMessage(error.message);
  }

  return fallback;
}

function mapPaymentErrorMessage(message: string): string {
  if (message.toLowerCase().includes("insufficient funds")) {
    return "Brak środków na koncie.";
  }

  return message;
}

function getParticipantName(participant: ParticipantResponseDTO): string {
  if (participant.childFirstName || participant.childSurname) {
    return `${participant.childFirstName} ${participant.childSurname}`.trim();
  }
  return participant.childName;
}

function hasDebt(participant: ParticipantResponseDTO): boolean {
  return participant.debt != null && participant.debt > 0;
}

function hasCredit(participant: ParticipantResponseDTO): boolean {
  return participant.credit != null && participant.credit > 0;
}

function invalidateSettlementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
  userId?: number,
) {
  queryClient.invalidateQueries({ queryKey: ["user-me"] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers", userId] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-details", fundraiserId],
  });
}

export function FundraiserSettlementDialog({
  fundraiserId,
  fundraiserTitle,
  open,
  onOpenChange,
}: FundraiserSettlementDialogProps) {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  const [pendingDebtPay, setPendingDebtPay] = useState<PendingDebtPay | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: fundraiserDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fundraiser-details", fundraiserId],
    queryFn: () => fetchFundraiserDetails(fundraiserId),
    enabled: open,
  });

  const { data: myChildren = [] } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: open,
  });

  const myChildIds = useMemo(
    () => myChildren.map((child) => child.id),
    [myChildren],
  );

  const participants = fundraiserDetails?.participants ?? [];
  const { mine: myParticipants, others: otherParticipants } = useMemo(
    () => partitionParticipants(participants, myChildIds),
    [participants, myChildIds],
  );

  const allDebtsPaid = participants.every(
    (participant) => !hasDebt(participant),
  );

  const payDebtMutation = useMutation({
    mutationFn: (pending: PendingDebtPay) =>
      payFundraiserDebt(fundraiserId, pending.childId),
    onSuccess: async () => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      invalidateSettlementQueries(queryClient, fundraiserId, user?.id);
      setPendingDebtPay(null);
      setActionError(null);
    },
    onError: (error) => {
      setPendingDebtPay(null);
      setActionError(getErrorMessage(error, "Nie udało się spłacić należności."));
    },
  });

  const isActionPending = payDebtMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isActionPending && !nextOpen) {
      setPendingDebtPay(null);
      setActionError(null);
    }
    if (!isActionPending) {
      onOpenChange(nextOpen);
    }
  };

  const renderParticipantRow = (participant: ParticipantResponseDTO) => {
    const participantHasDebt = hasDebt(participant);
    const participantHasCredit = hasCredit(participant);

    return (
      <li
        key={participant.childId}
        className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{getParticipantName(participant)}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {participantHasDebt && (
              <p className="font-medium text-destructive">
                Należność: {formatMoney(participant.debt)}
              </p>
            )}
            {participantHasCredit && (
              <p className="font-medium text-green-600">
                Nadpłata: {formatMoney(participant.credit)}
              </p>
            )}
            {!participantHasDebt && !participantHasCredit && (
              <p className="text-muted-foreground">Rozliczony</p>
            )}
          </div>
        </div>

        {participantHasDebt && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionPending}
            onClick={() => {
              setActionError(null);
              setPendingDebtPay({
                childId: participant.childId,
                childName: getParticipantName(participant),
                amount: participant.debt ?? 0,
              });
            }}
          >
            Spłać należność
          </Button>
        )}
      </li>
    );
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader className="w-full sm:place-items-stretch">
            <AlertDialogTitle>Rozliczenie — {fundraiserTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
                <p className="text-sm text-muted-foreground">
                  Rodzice mogą spłacać należności za dowolne dziecko. Po
                  spłacie wszystkich należności skarbnik może zakończyć
                  rozliczenie i zwrócić nadpłaty.
                </p>

                {isLoading && (
                  <p className="text-sm text-muted-foreground">Ładowanie...</p>
                )}

                {isError && (
                  <p className="text-sm text-destructive">
                    Nie udało się pobrać danych rozliczenia.
                  </p>
                )}

                {!isLoading && !isError && fundraiserDetails && (
                  <div className="space-y-4">
                    {myParticipants.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Moje dzieci
                        </p>
                        <ul className="space-y-2">
                          {myParticipants.map(renderParticipantRow)}
                        </ul>
                      </div>
                    )}

                    {myParticipants.length > 0 &&
                      otherParticipants.length > 0 && (
                        <div
                          role="separator"
                          className="border-t border-border"
                        />
                      )}

                    {otherParticipants.length > 0 && (
                      <ul className="space-y-2">
                        {otherParticipants.map(renderParticipantRow)}
                      </ul>
                    )}

                    {participants.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Brak uczestników w tej zbiórce.
                      </p>
                    )}

                    {!allDebtsPaid ? (
                      <p className="text-sm font-medium text-amber-700">
                        Rozliczenie zakończy się automatycznie, gdy wszyscy
                        uczestnicy spłacą swoje należności.
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-green-700">
                        Wszyscy uczestnicy spłacili należności. Rozliczenie
                        zostanie zakończone automatycznie.
                      </p>
                    )}
                  </div>
                )}

                {actionError && (
                  <p className="text-sm text-destructive">{actionError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>
              Zamknij
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDebtPay != null}
        onOpenChange={(nextOpen) => {
          if (!payDebtMutation.isPending && !nextOpen) {
            setPendingDebtPay(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź spłatę należności</AlertDialogTitle>
            <AlertDialogDescription>
              Czy chcesz spłacić należność w wysokości{" "}
              <strong>{formatMoney(pendingDebtPay?.amount)}</strong> za{" "}
              <strong>{pendingDebtPay?.childName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payDebtMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={payDebtMutation.isPending || pendingDebtPay == null}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDebtPay) {
                  payDebtMutation.mutate(pendingDebtPay);
                }
              }}
            >
              {payDebtMutation.isPending ? "Spłacanie..." : "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
