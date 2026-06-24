import { Badge } from "@/components/ui/badge";
import type { FundraiserApplicationListItemDTO } from "@/features/fundraisers/api/types";

interface PendingFundraiserApplicationCardProps {
  application: FundraiserApplicationListItemDTO;
}

function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount ?? 0);
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

function getGoalLabel(application: FundraiserApplicationListItemDTO): string {
  if (application.fundraiserType === "PER_CHILD_GOAL") {
    return `${formatMoney(application.perChildAmount)} na dziecko`;
  }

  return formatMoney(application.goalAmount);
}

export function PendingFundraiserApplicationCard({
  application,
}: PendingFundraiserApplicationCardProps) {
  const { title, classLabel, description, requestedAt } = application;

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">{title}</p>
          <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
            Oczekuje na zatwierdzenie
          </Badge>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          {classLabel && (
            <p className="text-sm text-muted-foreground">
              Klasa: <span className="text-foreground">{classLabel}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Kwota: <span className="text-foreground">{getGoalLabel(application)}</span>
          </p>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Złożono: {formatDate(requestedAt)}
          </p>
          <p className="mt-auto text-sm text-muted-foreground">
            Skarbnik musi zatwierdzić wniosek, zanim zbiórka stanie się aktywna.
          </p>
        </div>
      </div>
    </div>
  );
}
