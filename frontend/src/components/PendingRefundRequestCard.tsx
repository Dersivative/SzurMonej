import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/features/finance/lib/format-money";
import type { RefundRequestListItemDTO } from "@/features/fundraisers/api/types-refund";

interface PendingRefundRequestCardProps {
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

export function PendingRefundRequestCard({
  request,
}: PendingRefundRequestCardProps) {
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
            Kwota: <span className="text-foreground">{formatMoney(request.amount)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Złożono: {formatDate(request.requestedAt)}
          </p>
          <p className="mt-auto text-sm text-muted-foreground">
            Skarbnik musi zatwierdzić zwrot, zanim środki wrócą na Twoje konto.
          </p>
        </div>
      </div>
    </div>
  );
}
