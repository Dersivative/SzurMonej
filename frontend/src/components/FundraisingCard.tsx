import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditFundraiserDialog } from "@/components/EditFundraiserDialog";
import { FundraiserParticipantsDialog } from "@/components/FundraiserParticipantsDialog";
import { FundraiserPayDialog } from "@/components/FundraiserPayDialog";
import { FundraiserPaymentsDialog } from "@/components/FundraiserPaymentsDialog";
import { FundraiserSettlementDialog } from "@/components/FundraiserSettlementDialog";
import { FundraiserServiceDialog } from "@/components/FundraiserServiceDialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/features/finance/lib/format-money";
import { openFundraiserChat } from "@/features/chat/lib/open-chat";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { getFundraiserPlannedEndDate } from "@/features/fundraisers/lib/fundraiser-dates";
import { reconcileFundraiser } from "@/features/fundraisers/api/reconcile-fundraiser";
import { reopenFundraiser } from "@/features/fundraisers/api/reopen-fundraiser";
import { withdrawAllFundraiser } from "@/features/fundraisers/api/withdraw-all-fundraiser";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";

const fundraiserBadgeClassName = "h-7 px-3 py-1 text-sm";

interface FundraisingCardProps {
  fundraiser: FundraiserResponseDTO;
  isTreasurer: boolean;
  onUpdate: (fundraiser: FundraiserResponseDTO) => void;
}

function formatDate(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }

  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}.${month}.${year}`;
}

function getStatusLabel(status: FundraiserResponseDTO["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Aktywna";
    case "RECONCILING":
      return "Rozliczanie";
    case "FINISHED":
      return "Zakończona";
    default:
      return status;
  }
}

function getProgressValue(
  current: number | null | undefined,
  goal: number,
): number {
  if (!goal || goal <= 0) {
    return 0;
  }

  const currentAmount = current ?? 0;
  return Math.min(100, Math.max(0, (currentAmount / goal) * 100));
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

function invalidateFundraiserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
) {
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-details", fundraiserId],
  });
}

export function FundraisingCard({
  fundraiser,
  isTreasurer,
  onUpdate,
}: FundraisingCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [withdrawRemainingFunds, setWithdrawRemainingFunds] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const progressValue = getProgressValue(
    fundraiser.currentAmount,
    fundraiser.goalAmount,
  );

  const isActive = fundraiser.status === "ACTIVE";
  const isReconciling = fundraiser.status === "RECONCILING";
  const isFinished = fundraiser.status === "FINISHED";

  const finishFundraiserMutation = useMutation({
    mutationFn: (shouldWithdrawRemaining: boolean) =>
      shouldWithdrawRemaining
        ? withdrawAllFundraiser(fundraiser.id)
        : reconcileFundraiser(fundraiser.id),
    onSuccess: async () => {
      invalidateFundraiserQueries(queryClient, fundraiser.id);
      const updated = await fetchFundraiserDetails(fundraiser.id);
      onUpdate(updated);
      setFinishConfirmOpen(false);
      setWithdrawRemainingFunds(false);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        getErrorMessage(error, "Nie udało się zakończyć zbiórki."),
      );
    },
  });

  const reopenFundraiserMutation = useMutation({
    mutationFn: () => reopenFundraiser(fundraiser.id),
    onSuccess: async () => {
      invalidateFundraiserQueries(queryClient, fundraiser.id);
      const updated = await fetchFundraiserDetails(fundraiser.id);
      onUpdate(updated);
      setReopenConfirmOpen(false);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        getErrorMessage(error, "Nie udało się otworzyć zbiórki ponownie."),
      );
    },
  });

  const isLifecyclePending =
    finishFundraiserMutation.isPending || reopenFundraiserMutation.isPending;

  const handleFinishConfirmOpenChange = (nextOpen: boolean) => {
    if (!finishFundraiserMutation.isPending) {
      if (!nextOpen) {
        setWithdrawRemainingFunds(false);
      }
      setFinishConfirmOpen(nextOpen);
    }
  };

  const handleReopenConfirmOpenChange = (nextOpen: boolean) => {
    if (!reopenFundraiserMutation.isPending) {
      setReopenConfirmOpen(nextOpen);
    }
  };

  const handleOpenChat = async () => {
    setIsOpeningChat(true);
    try {
      const chatId = await openFundraiserChat(fundraiser.id);
      navigate(`/app/chats/${chatId}`);
    } catch {
      window.alert("Nie udało się otworzyć czatu zbiórki.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <div className="h-full">
      <div
        className={`flex h-full flex-col gap-3 rounded-xl border p-5 ${
          isTreasurer ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-card"
        }`}
      >
        <div className="flex flex-1 gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-xl font-semibold leading-snug">{fundraiser.title}</p>

            <div className="flex flex-wrap gap-2">
              {fundraiser.classLabel && (
                <Badge variant="secondary" className={fundraiserBadgeClassName}>
                  {fundraiser.classLabel}
                </Badge>
              )}
              <Badge variant="secondary" className={fundraiserBadgeClassName}>
                {getStatusLabel(fundraiser.status)}
              </Badge>
            </div>

            <p className="min-h-12 flex-1 text-base leading-6 text-muted-foreground line-clamp-2">
              {fundraiser.description ?? "\u00A0"}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap content-start justify-end gap-2 sm:max-w-64">
            {isActive && (
              <Button type="button" onClick={() => setPayOpen(true)}>
                Wpłaty
              </Button>
            )}
            {isReconciling && (
              <Button type="button" onClick={() => setSettlementOpen(true)}>
                Rozliczenie
              </Button>
            )}
            {isTreasurer && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceOpen(true)}
              >
                Obsługa zbiórki
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isOpeningChat}
              onClick={() => void handleOpenChat()}
            >
              {isOpeningChat ? "Otwieranie..." : "Czat"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setParticipantsOpen(true)}
            >
              Uczestnicy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentsOpen(true)}
            >
              Historia
            </Button>
            {isTreasurer && isActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                Edytuj
              </Button>
            )}
            {isTreasurer && isActive && (
              <Button
                type="button"
                variant="destructive"
                disabled={isLifecyclePending}
                onClick={() => {
                  setActionError(null);
                  setWithdrawRemainingFunds(false);
                  setFinishConfirmOpen(true);
                }}
              >
                Zakończ zbiórkę
              </Button>
            )}
            {isTreasurer && isFinished && (
              <Button
                type="button"
                disabled={isLifecyclePending}
                onClick={() => {
                  setActionError(null);
                  setReopenConfirmOpen(true);
                }}
              >
                Otwórz ponownie
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <Progress value={progressValue} className="h-2.5 w-full" />
          <Badge variant="outline" className={fundraiserBadgeClassName}>
            {formatMoney(fundraiser.currentAmount)} /{" "}
            {formatMoney(fundraiser.goalAmount)}
          </Badge>
          <p className="text-base text-foreground">
            Start: {formatDate(fundraiser.startedAt)} · Koniec:{" "}
            {formatDate(getFundraiserPlannedEndDate(fundraiser))}
          </p>
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
        </div>
      </div>

      {isActive && (
        <FundraiserPayDialog
          fundraiserId={fundraiser.id}
          fundraiserTitle={fundraiser.title}
          open={payOpen}
          onOpenChange={setPayOpen}
          onUpdate={onUpdate}
        />
      )}

      {isReconciling && (
        <FundraiserSettlementDialog
          fundraiserId={fundraiser.id}
          fundraiserTitle={fundraiser.title}
          open={settlementOpen}
          onOpenChange={setSettlementOpen}
        />
      )}

      <FundraiserParticipantsDialog
        fundraiserId={fundraiser.id}
        fundraiserTitle={fundraiser.title}
        isTreasurer={isTreasurer}
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
        onUpdate={onUpdate}
      />

      <FundraiserPaymentsDialog
        fundraiserId={fundraiser.id}
        fundraiserTitle={fundraiser.title}
        isTreasurer={isTreasurer}
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
      />

      {isTreasurer && (
        <FundraiserServiceDialog
          fundraiser={fundraiser}
          open={serviceOpen}
          onOpenChange={setServiceOpen}
        />
      )}

      {isTreasurer && (
        <EditFundraiserDialog
          fundraiser={fundraiser}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdate={onUpdate}
        />
      )}

      <AlertDialog
        open={reopenConfirmOpen}
        onOpenChange={handleReopenConfirmOpenChange}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Otwórz zbiórkę ponownie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz otworzyć zbiórkę ponownie? Zbiórka wróci do
              statusu aktywnej i będzie można ponownie przyjmować wpłaty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopenFundraiserMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reopenFundraiserMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                reopenFundraiserMutation.mutate();
              }}
            >
              {reopenFundraiserMutation.isPending
                ? "Otwieranie..."
                : "Otwórz ponownie"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={finishConfirmOpen}
        onOpenChange={handleFinishConfirmOpenChange}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Zakończ zbiórkę</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-1 text-left text-foreground">
                <p className="text-sm text-muted-foreground">
                  Zbiórka przejdzie w etap rozliczania. Rodzice będą mogli
                  dopłacić brakujące składki. Jeśli pozostaną jakieś środki,
                  zostaną zwrócone rodzicom.
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={withdrawRemainingFunds}
                    onChange={(event) =>
                      setWithdrawRemainingFunds(event.target.checked)
                    }
                    disabled={finishFundraiserMutation.isPending}
                    className="size-4 rounded border-input"
                  />
                  <span>
                    Wypłać pozostałe środki (
                    {formatMoney(fundraiser.currentAmount)})
                  </span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishFundraiserMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={finishFundraiserMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                finishFundraiserMutation.mutate(withdrawRemainingFunds);
              }}
            >
              {finishFundraiserMutation.isPending
                ? "Kończenie..."
                : "Zakończ zbiórkę"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
