import { Badge } from "@/components/ui/badge";
import type { EnrollmentApplicationResponseDTO } from "@/features/users/api/types";

interface PendingEnrollmentCardProps {
  application: EnrollmentApplicationResponseDTO;
}

function formatDate(dateString: string): string {
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

export function PendingEnrollmentCard({
  application,
}: PendingEnrollmentCardProps) {
  const { child, classLabel, requestedAt } = application;

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">
            {child.name} {child.surname}
          </p>
          <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
            Oczekuje na zatwierdzenie
          </Badge>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Klasa: <span className="text-foreground">{classLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Złożono: {formatDate(requestedAt)}
          </p>
          <p className="mt-auto text-sm text-muted-foreground">
            Skarbnik musi zatwierdzić zapis, zanim dziecko pojawi się w klasie.
          </p>
        </div>
      </div>
    </div>
  );
}
