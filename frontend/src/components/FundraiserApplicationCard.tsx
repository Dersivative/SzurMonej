import { useState } from "react";
import { ReviewFundraiserApplicationDialog } from "@/components/ReviewFundraiserApplicationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { FundraiserApplicationListItemDTO } from "@/features/fundraisers/api/types";

const fundraiserBadgeClassName = "h-7 px-3 py-1 text-sm";

interface FundraiserApplicationCardProps {
  application: FundraiserApplicationListItemDTO;
  isTreasurer?: boolean;
}

function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount ?? 0);
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getGoalLabel(application: FundraiserApplicationListItemDTO): string {
  if (application.fundraiserType === "PER_CHILD_GOAL") {
    return `${formatMoney(application.perChildAmount)} / dziecko`;
  }

  return formatMoney(application.goalAmount);
}

export function FundraiserApplicationCard({
  application,
  isTreasurer = false,
}: FundraiserApplicationCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">{application.title}</p>
          {isTreasurer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setReviewOpen(true)}
            >
              Rozpatrz
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {application.classLabel && (
              <Badge variant="secondary" className={fundraiserBadgeClassName}>
                {application.classLabel}
              </Badge>
            )}
            <Badge variant="secondary" className={fundraiserBadgeClassName}>
              Oczekuje na zatwierdzenie
            </Badge>
          </div>

          {application.requestingParent?.fullName && (
            <p className="text-sm text-muted-foreground">
              Wniosek od: {application.requestingParent.fullName}
            </p>
          )}

          <p className="min-h-12 text-base leading-6 text-muted-foreground line-clamp-2">
            {application.description ?? "\u00A0"}
          </p>

          <div className="mt-auto space-y-2.5">
            <Progress value={0} className="h-2.5" />
            <Badge variant="outline" className={fundraiserBadgeClassName}>
              {getGoalLabel(application)}
            </Badge>
            <p className="text-base text-foreground">
              Złożono: {formatDateTime(application.requestedAt)}
            </p>
          </div>
        </div>
      </div>

      {isTreasurer && (
        <ReviewFundraiserApplicationDialog
          application={application}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
        />
      )}
    </div>
  );
}
