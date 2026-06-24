import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreateRefundRequestDialog } from "@/components/CreateRefundRequestDialog";
import { EditFundraiserDialog } from "@/components/EditFundraiserDialog";
import { FundraiserActionsDialog } from "@/components/FundraiserActionsDialog";
import { FundraiserPaymentsDialog } from "@/components/FundraiserPaymentsDialog";
import { WithdrawFromFundraiserDialog } from "@/components/WithdrawFromFundraiserDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { canParentRequestRefund } from "@/features/fundraisers/lib/refund-request";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

const fundraiserBadgeClassName = "h-7 px-3 py-1 text-sm";

interface FundraisingCardProps {
  fundraiser: FundraiserResponseDTO;
  isTreasurer: boolean;
  onUpdate: (fundraiser: FundraiserResponseDTO) => void;
}

function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount ?? 0);
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

export function FundraisingCard({
  fundraiser,
  isTreasurer,
  onUpdate,
}: FundraisingCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const { data: myChildren = [] } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: !isTreasurer,
  });

  const { data: pendingRefundRequests = [] } = useQuery({
    queryKey: ["fundraiser-refund-requests", fundraiser.id],
    queryFn: () => fetchPendingRefundRequests(fundraiser.id),
    enabled: fundraiser.status === "ACTIVE",
  });

  const progressValue = getProgressValue(
    fundraiser.currentAmount,
    fundraiser.goalAmount,
  );

  const showRefundRequestOption = canParentRequestRefund(
    fundraiser,
    myChildren,
    pendingRefundRequests,
  );

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-snug">{fundraiser.title}</p>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionsOpen(true)}
            >
              Opcje
            </Button>
            {isTreasurer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                Edytuj
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-3">
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

          <p className="min-h-12 text-base leading-6 text-muted-foreground line-clamp-2">
            {fundraiser.description ?? "\u00A0"}
          </p>

          <div className="mt-auto space-y-2.5">
            <Progress value={progressValue} className="h-2.5" />
            <Badge variant="outline" className={fundraiserBadgeClassName}>
              {formatMoney(fundraiser.currentAmount)} /{" "}
              {formatMoney(fundraiser.goalAmount)}
            </Badge>
            <p className="text-base text-foreground">
              Start: {formatDate(fundraiser.startedAt)} · Koniec:{" "}
              {formatDate(fundraiser.endedAt)}
            </p>
          </div>
        </div>
      </div>

      <FundraiserActionsDialog
        fundraiserTitle={fundraiser.title}
        isTreasurer={isTreasurer}
        showRefundRequest={showRefundRequestOption}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        onPaymentsClick={() => setPaymentsOpen(true)}
        onWithdrawClick={() => setWithdrawOpen(true)}
        onRefundRequestClick={() => setRefundOpen(true)}
      />

      <FundraiserPaymentsDialog
        fundraiserId={fundraiser.id}
        fundraiserTitle={fundraiser.title}
        isTreasurer={isTreasurer}
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
      />

      {isTreasurer && (
        <>
          <EditFundraiserDialog
            fundraiser={fundraiser}
            open={editOpen}
            onOpenChange={setEditOpen}
            onUpdate={onUpdate}
          />
          <WithdrawFromFundraiserDialog
            fundraiser={fundraiser}
            open={withdrawOpen}
            onOpenChange={setWithdrawOpen}
          />
        </>
      )}

      {showRefundRequestOption && (
        <CreateRefundRequestDialog
          fundraiser={fundraiser}
          myChildren={myChildren}
          pendingRefundRequests={pendingRefundRequests}
          open={refundOpen}
          onOpenChange={setRefundOpen}
        />
      )}
    </div>
  );
}
