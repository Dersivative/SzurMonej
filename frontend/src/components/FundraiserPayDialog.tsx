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
import { transferToFundraiser } from "@/features/finance/api/transfer-to-fundraiser";
import { formatMoney } from "@/features/finance/lib/format-money";
import {
  getParticipantRemainingAmount,
  isParticipantUnpaid,
  partitionParticipants,
} from "@/features/finance/lib/fundraiser-payment";
import { createRefundRequest } from "@/features/fundraisers/api/create-refund-request";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";
import type {
  FundraiserResponseDTO,
  ParticipantResponseDTO,
} from "@/features/fundraisers/api/types";
import {
  canUserRequestRefundForParticipant,
  participantHasPendingRefundRequest,
} from "@/features/fundraisers/lib/refund-request";
import { fetchUserMe } from "@/features/users/api/get-me";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

interface FundraiserPayDialogProps {
  fundraiserId: number;
  fundraiserTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (fundraiser: FundraiserResponseDTO) => void;
}

interface PendingPayParticipant {
  childId: number;
  childName: string;
  amount: number;
}

interface PendingRefundParticipant {
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

function invalidateAfterPayment(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
  userId?: number,
) {
  queryClient.invalidateQueries({ queryKey: ["user-me"] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers", userId] });
  queryClient.invalidateQueries({ queryKey: ["child-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-details", fundraiserId] });
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-refund-requests", fundraiserId],
  });
}

async function refreshFundraiserAfterPayment(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
  userId: number | undefined,
  onUpdate?: (fundraiser: FundraiserResponseDTO) => void,
) {
  const updated = await fetchFundraiserDetails(fundraiserId);
  queryClient.setQueryData(["fundraiser-details", fundraiserId], updated);
  onUpdate?.(updated);
  invalidateAfterPayment(queryClient, fundraiserId, userId);
}

function invalidateAfterRefund(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["class-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-refund-requests"] });
}

export function FundraiserPayDialog({
  fundraiserId,
  fundraiserTitle,
  open,
  onOpenChange,
  onUpdate,
}: FundraiserPayDialogProps) {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  const [pendingPay, setPendingPay] = useState<PendingPayParticipant | null>(null);
  const [pendingRefund, setPendingRefund] =
    useState<PendingRefundParticipant | null>(null);
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

  const { data: pendingRefundRequests = [] } = useQuery({
    queryKey: ["fundraiser-refund-requests", fundraiserId],
    queryFn: () => fetchPendingRefundRequests(fundraiserId),
    enabled: open,
  });

  const myChildIds = useMemo(
    () => myChildren.map((child) => child.id),
    [myChildren],
  );

  const { mine, others } = useMemo(() => {
    const participants = fundraiserDetails?.participants ?? [];
    return partitionParticipants(participants, myChildIds);
  }, [fundraiserDetails?.participants, myChildIds]);

  const payMutation = useMutation({
    mutationFn: async (participant: PendingPayParticipant) => {
      const refreshed = await fetchFundraiserDetails(fundraiserId);
      const target = refreshed.participants?.find(
        (item) => item.childId === participant.childId,
      );

      if (!target || !isParticipantUnpaid(refreshed, target)) {
        throw new Error(
          "To dziecko zostało już opłacone. Odśwież listę i spróbuj ponownie.",
        );
      }

      await transferToFundraiser({
        fundraiserId,
        childId: participant.childId,
      });
    },
    onSuccess: async () => {
      const refreshedUser = await fetchUserMe();
      setAuth(mapUserResponse(refreshedUser));
      await refreshFundraiserAfterPayment(
        queryClient,
        fundraiserId,
        user?.id,
        onUpdate,
      );
      setPendingPay(null);
      setActionError(null);
    },
    onError: (error) => {
      setPendingPay(null);
      setActionError(getErrorMessage(error, "Nie udało się wykonać wpłaty."));
    },
  });

  const refundMutation = useMutation({
    mutationFn: (participant: PendingRefundParticipant) =>
      createRefundRequest(fundraiserId, participant.childId),
    onSuccess: async () => {
      invalidateAfterRefund(queryClient);
      await queryClient.refetchQueries({
        queryKey: ["fundraiser-refund-requests", fundraiserId],
      });
      await refreshFundraiserAfterPayment(
        queryClient,
        fundraiserId,
        user?.id,
        onUpdate,
      );
      setPendingRefund(null);
      setActionError(null);
    },
    onError: (error) => {
      setPendingRefund(null);
      setActionError(
        getErrorMessage(error, "Nie udało się złożyć prośby o zwrot."),
      );
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!payMutation.isPending && !refundMutation.isPending) {
      if (!nextOpen) {
        setPendingPay(null);
        setPendingRefund(null);
        setActionError(null);
      }
      onOpenChange(nextOpen);
    }
  };

  const getRowAction = (participant: ParticipantResponseDTO) => {
    if (!fundraiserDetails || !user) {
      return null;
    }

    if (isParticipantUnpaid(fundraiserDetails, participant)) {
      return (
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setActionError(null);
            setPendingPay({
              childId: participant.childId,
              childName: participant.childName,
              amount: getParticipantRemainingAmount(
                fundraiserDetails,
                participant,
              ),
            });
          }}
        >
          Opłać
        </Button>
      );
    }

    if (
      canUserRequestRefundForParticipant(
        fundraiserDetails,
        participant,
        user.fullName,
        fundraiserDetails.history ?? [],
        pendingRefundRequests,
      )
    ) {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setActionError(null);
            setPendingRefund({
              childId: participant.childId,
              childName: participant.childName,
              amount: participant.totalContribution ?? 0,
            });
          }}
        >
          Prośba o zwrot
        </Button>
      );
    }

    if (
      participantHasPendingRefundRequest(participant, pendingRefundRequests)
    ) {
      return (
        <span className="text-sm text-muted-foreground">Wniosek o zwrot</span>
      );
    }

    return (
      <span className="text-sm text-muted-foreground">Opłacono</span>
    );
  };

  const renderParticipantRow = (participant: ParticipantResponseDTO) => (
    <li
      key={participant.childId}
      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{participant.childName}</p>
        {isParticipantUnpaid(fundraiserDetails!, participant) && (
          <p className="text-xs text-muted-foreground">
            Do zapłaty:{" "}
            {formatMoney(
              getParticipantRemainingAmount(fundraiserDetails!, participant),
            )}
          </p>
        )}
      </div>
      {getRowAction(participant)}
    </li>
  );

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader className="w-full sm:place-items-stretch">
            <AlertDialogTitle>Opłać — {fundraiserTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
                <p className="text-sm text-muted-foreground">
                  Wybierz dziecko, za które chcesz wpłacić składkę lub złożyć
                  prośbę o zwrot.
                </p>

                {isLoading && (
                  <p className="text-sm text-muted-foreground">Ładowanie...</p>
                )}

                {isError && (
                  <p className="text-sm text-destructive">
                    Nie udało się pobrać listy uczestników.
                  </p>
                )}

                {!isLoading && !isError && fundraiserDetails && (
                  <div className="space-y-4">
                    {mine.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Moje dzieci
                        </p>
                        <ul className="space-y-2">
                          {mine.map(renderParticipantRow)}
                        </ul>
                      </div>
                    )}

                    {mine.length > 0 && others.length > 0 && (
                      <div
                        role="separator"
                        className="my-6 border-t border-border"
                      />
                    )}

                    {others.length > 0 && (
                      <ul className="space-y-2">
                        {others.map(renderParticipantRow)}
                      </ul>
                    )}

                    {mine.length === 0 && others.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Brak uczestników w tej zbiórce.
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
            <AlertDialogCancel
              disabled={payMutation.isPending || refundMutation.isPending}
            >
              Zamknij
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingPay != null}
        onOpenChange={(nextOpen) => {
          if (!payMutation.isPending && !nextOpen) {
            setPendingPay(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź wpłatę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy chcesz wpłacić{" "}
              <strong>{formatMoney(pendingPay?.amount)}</strong> za{" "}
              <strong>{pendingPay?.childName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={payMutation.isPending || pendingPay == null}
              onClick={(event) => {
                event.preventDefault();
                if (pendingPay) {
                  payMutation.mutate(pendingPay);
                }
              }}
            >
              {payMutation.isPending ? "Wykonywanie..." : "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRefund != null}
        onOpenChange={(nextOpen) => {
          if (!refundMutation.isPending && !nextOpen) {
            setPendingRefund(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź prośbę o zwrot</AlertDialogTitle>
            <AlertDialogDescription>
              Czy chcesz złożyć prośbę o zwrot wpłaty za{" "}
              <strong>{pendingRefund?.childName}</strong>? Skarbnik musi ją
              zatwierdzić.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refundMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={refundMutation.isPending || pendingRefund == null}
              onClick={(event) => {
                event.preventDefault();
                if (pendingRefund) {
                  refundMutation.mutate(pendingRefund);
                }
              }}
            >
              {refundMutation.isPending ? "Wysyłanie..." : "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
