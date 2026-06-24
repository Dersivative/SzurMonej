import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/features/finance/lib/format-money";
import { approveRefundRequest } from "@/features/fundraisers/api/approve-refund-request";
import { rejectRefundRequest } from "@/features/fundraisers/api/reject-refund-request";
import type { RefundRequestListItemDTO } from "@/features/fundraisers/api/types-refund";

interface RefundRequestActionCardProps {
  request: RefundRequestListItemDTO;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "—";
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
  }
  return fallback;
}

function invalidateRefundQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["class-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-removals"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-removals"] });
}

export function RefundRequestActionCard({ request }: RefundRequestActionCardProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: () => approveRefundRequest(request.id),
    onSuccess: () => {
      setError(null);
      invalidateRefundQueries(queryClient);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się zatwierdzić zwrotu."),
      );
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: () => rejectRefundRequest(request.id),
    onSuccess: () => {
      setError(null);
      invalidateRefundQueries(queryClient);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się odrzucić wniosku o zwrot."),
      );
    },
  });

  const isPending = isApproving || isRejecting;

  const childName = `${request.participant.child.name} ${request.participant.child.surname}`;

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">
            {request.fundraiserTitle}
          </p>
          <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
            Oczekuje na zatwierdzenie
          </Badge>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          {request.classLabel && (
            <p className="text-sm text-muted-foreground">
              Klasa: <span className="text-foreground">{request.classLabel}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Dziecko: <span className="text-foreground">{childName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Wnioskodawca:{" "}
            <span className="text-foreground">{request.requester.fullName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Kwota: <span className="text-foreground">{formatMoney(request.amount)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Złożono: {formatDate(request.requestedAt)}
          </p>

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => approve()}
            >
              {isApproving ? "Zatwierdzanie..." : "Zatwierdź zwrot"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => reject()}
            >
              {isRejecting ? "Odrzucanie..." : "Odrzuć"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
