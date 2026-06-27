import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { InsufficientFundraiserFundsAlert } from "@/components/InsufficientFundraiserFundsAlert";
import { RemoveChildFromClassDialog } from "@/components/RemoveChildFromClassDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TreasurerPendingRemovalItem } from "@/features/classes/api/get-treasurer-pending-removals";
import { removeClassMembership } from "@/features/classes/api/remove-class-membership";
import { approveRefundRequest } from "@/features/fundraisers/api/approve-refund-request";
import {
  getRefundApprovalErrorMessage,
  isInsufficientFundraiserFundsError,
} from "@/features/fundraisers/lib/refund-approval-error";

interface RemovalAcceptCardProps {
  item: TreasurerPendingRemovalItem;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export function RemovalAcceptCard({ item }: RemovalAcceptCardProps) {
  const { classId, classLabel, child, membershipId, pendingRefunds } = item;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [insufficientFundsOpen, setInsufficientFundsOpen] = useState(false);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["treasurer-pending-removals"],
    });
    queryClient.invalidateQueries({ queryKey: ["my-pending-removals"] });
    queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
    queryClient.invalidateQueries({ queryKey: ["my-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["school-class", classId] });
    queryClient.invalidateQueries({ queryKey: ["class-refund-requests", classId] });
    queryClient.invalidateQueries({ queryKey: ["my-children"] });
    queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  };

  const { mutate: approveRefund, isPending: isApprovingRefund } = useMutation({
    mutationFn: (requestId: number) => approveRefundRequest(requestId),
    onSuccess: () => {
      setError(null);
      invalidateQueries();
    },
    onError: (mutationError) => {
      if (isInsufficientFundraiserFundsError(mutationError)) {
        setInsufficientFundsOpen(true);
        return;
      }
      setError(
        getRefundApprovalErrorMessage(
          mutationError,
          "Nie udało się zatwierdzić zwrotu.",
        ),
      );
    },
  });

  const { mutate: finalizeRemoval, isPending: isFinalizing } = useMutation({
    mutationFn: () => removeClassMembership(membershipId),
    onSuccess: () => {
      setError(null);
      setFinalizeOpen(false);
      invalidateQueries();
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          "Nie udało się zakończyć wypisywania dziecka.",
        ),
      );
    },
  });

  const isPending = isApprovingRefund || isFinalizing;
  const hasPendingRefunds = pendingRefunds.length > 0;

  return (
    <>
      <div className="h-full">
        <div className="flex h-full flex-col rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xl font-semibold leading-snug">
              {child.name} {child.surname}
            </p>
            <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
              W trakcie wypisywania
            </Badge>
          </div>

          <div className="mt-3 flex flex-1 flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Klasa: <span className="text-foreground">{classLabel}</span>
            </p>

            {hasPendingRefunds && (
              <div className="space-y-2">
                {pendingRefunds.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-2 rounded-md border p-3"
                  >
                    <p className="text-sm text-muted-foreground">
                      Zwrot {formatMoney(request.amount)} dla{" "}
                      {request.requester.fullName}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => approveRefund(request.id)}
                    >
                      {isApprovingRefund ? "Zatwierdzanie..." : "Zatwierdź zwrot"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!hasPendingRefunds && (
              <p className="text-sm text-muted-foreground">
                Brak oczekujących zwrotów — możesz zakończyć wypisanie.
              </p>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {!hasPendingRefunds && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => setFinalizeOpen(true)}
                >
                  Zakończ wypisanie
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </div>

      <RemoveChildFromClassDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        childName={child.name}
        childSurname={child.surname}
        classLabel={classLabel}
        isPending={isFinalizing}
        action="finalize"
        onConfirm={() => finalizeRemoval()}
      />

      <InsufficientFundraiserFundsAlert
        open={insufficientFundsOpen}
        onOpenChange={setInsufficientFundsOpen}
      />
    </>
  );
}
