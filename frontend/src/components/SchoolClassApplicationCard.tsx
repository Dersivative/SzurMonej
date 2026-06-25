import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveClassApplication } from "@/features/classes/api/approve-class-application";
import type { SchoolClassApplicationResponseDTO } from "@/features/classes/api/types";
import { rejectClassApplication } from "@/features/classes/api/reject-class-application";

interface SchoolClassApplicationCardProps {
  application: SchoolClassApplicationResponseDTO;
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function invalidateAdminQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["pending-class-applications"] });
  queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
  queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-class-application"] });
  queryClient.invalidateQueries({ queryKey: ["all-users-with-children"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
}

export function SchoolClassApplicationCard({
  application,
}: SchoolClassApplicationCardProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: () => approveClassApplication(application.id),
    onSuccess: () => {
      setError(null);
      invalidateAdminQueries(queryClient);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się zatwierdzić wniosku."));
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: () => rejectClassApplication(application.id),
    onSuccess: () => {
      setError(null);
      invalidateAdminQueries(queryClient);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się odrzucić wniosku."));
    },
  });

  const isPending = isApproving || isRejecting;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xl font-semibold leading-snug">
          {application.proposedName}
        </p>
        <Badge variant="secondary" className="h-7 shrink-0 px-3 py-1 text-sm">
          Oczekuje
        </Badge>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Wnioskodawca:{" "}
          <span className="text-foreground">
            {application.requestingParent?.fullName ?? "—"}
          </span>
        </p>
        {application.requestingParent?.email && (
          <p className="text-sm text-muted-foreground">
            E-mail:{" "}
            <span className="text-foreground">
              {application.requestingParent.email}
            </span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Złożono: {formatDate(application.requestedAt)}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => approve()}
          >
            {isApproving ? "Zatwierdzanie..." : "Zatwierdź"}
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
  );
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
