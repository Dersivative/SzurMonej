import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FundraiserParticipantsDialog } from "@/components/FundraiserParticipantsDialog";
import { FundraiserPaymentsDialog } from "@/components/FundraiserPaymentsDialog";
import { FundraiserServiceDialog } from "@/components/FundraiserServiceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/features/finance/lib/format-money";
import { openFundraiserChat } from "@/features/chat/lib/open-chat";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { getFundraiserPlannedEndDate } from "@/features/fundraisers/lib/fundraiser-dates";

interface AdminFundraisingCardProps {
  fundraiser: FundraiserResponseDTO;
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

function getProgressValue(current: number | null | undefined, goal: number): number {
  if (!goal || goal <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, ((current ?? 0) / goal) * 100));
}

export function AdminFundraisingCard({
  fundraiser,
  onUpdate,
}: AdminFundraisingCardProps) {
  const navigate = useNavigate();
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const handleOpenChat = async () => {
    setIsOpeningChat(true);
    try {
      const chatId = await openFundraiserChat(fundraiser.id);
      navigate(`/admin/chats/${chatId}`);
    } catch {
      window.alert("Nie udało się otworzyć czatu zbiórki.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xl font-semibold">{fundraiser.title}</p>
            <p className="text-sm text-muted-foreground">
              {fundraiser.classLabel ?? "—"} · Skarbnik:{" "}
              {fundraiser.treasurer?.fullName ?? "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{getStatusLabel(fundraiser.status)}</Badge>
            <Badge variant="outline">
              {formatMoney(fundraiser.currentAmount)} / {formatMoney(fundraiser.goalAmount)}
            </Badge>
          </div>

          <Progress
            value={getProgressValue(fundraiser.currentAmount, fundraiser.goalAmount)}
            className="h-2"
          />

          <p className="text-sm text-muted-foreground">
            Start: {formatDate(fundraiser.startedAt)} · Koniec:{" "}
            {formatDate(getFundraiserPlannedEndDate(fundraiser))}
          </p>

          <p className="text-xs text-muted-foreground">
            Obsługa zbiórki i usunięcia uczestników są wykonywane z konta administratora.
            Edycja zbiórki i rozliczenia są dostępne tylko dla skarbnika.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:min-w-56 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setParticipantsOpen(true)}>
            Uczestnicy
          </Button>
          <Button type="button" variant="outline" onClick={() => setServiceOpen(true)}>
            Obsługa zbiórki
          </Button>
          <Button type="button" variant="outline" onClick={() => setPaymentsOpen(true)}>
            Historia
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isOpeningChat}
            onClick={() => void handleOpenChat()}
          >
            {isOpeningChat ? "Otwieranie..." : "Czat"}
          </Button>
        </div>
      </div>

      <FundraiserParticipantsDialog
        fundraiserId={fundraiser.id}
        fundraiserTitle={fundraiser.title}
        isTreasurer={false}
        isAdmin
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
        onUpdate={onUpdate}
      />

      <FundraiserPaymentsDialog
        fundraiserId={fundraiser.id}
        fundraiserTitle={fundraiser.title}
        isTreasurer={false}
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
      />

      <FundraiserServiceDialog
        fundraiser={fundraiser}
        open={serviceOpen}
        onOpenChange={setServiceOpen}
      />
    </div>
  );
}
