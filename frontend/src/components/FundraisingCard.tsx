import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditFundraiserDialog } from "@/components/EditFundraiserDialog";
import { FundraiserParticipantsDialog } from "@/components/FundraiserParticipantsDialog";
import { FundraiserPayDialog } from "@/components/FundraiserPayDialog";
import { FundraiserPaymentsDialog } from "@/components/FundraiserPaymentsDialog";
import { FundraiserWithdrawalsDialog } from "@/components/FundraiserWithdrawalsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/features/finance/lib/format-money";
import { openFundraiserChat } from "@/features/chat/lib/open-chat";
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

export function FundraisingCard({
  fundraiser,
  isTreasurer,
  onUpdate,
}: FundraisingCardProps) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [withdrawalsOpen, setWithdrawalsOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const progressValue = getProgressValue(
    fundraiser.currentAmount,
    fundraiser.goalAmount,
  );

  const isActive = fundraiser.status === "ACTIVE";

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
      <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5">
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

          <div className="flex shrink-0 flex-col gap-1.5 sm:min-w-48">
            <div className="grid grid-cols-2 gap-2">
              {isActive ? (
                <Button type="button" onClick={() => setPayOpen(true)}>
                  Wpłaty
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawalsOpen(true)}
              >
                Wypłaty
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentsOpen(true)}
              >
                Historia
              </Button>
              {isTreasurer && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
                  Edytuj
                </Button>
              )}
            </div>
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
            {formatDate(fundraiser.endedAt)}
          </p>
        </div>
      </div>

      {isActive && (
        <FundraiserPayDialog
          fundraiserId={fundraiser.id}
          fundraiserTitle={fundraiser.title}
          open={payOpen}
          onOpenChange={setPayOpen}
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

      <FundraiserWithdrawalsDialog
        fundraiser={fundraiser}
        isTreasurer={isTreasurer}
        open={withdrawalsOpen}
        onOpenChange={setWithdrawalsOpen}
      />

      {isTreasurer && (
        <EditFundraiserDialog
          fundraiser={fundraiser}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
