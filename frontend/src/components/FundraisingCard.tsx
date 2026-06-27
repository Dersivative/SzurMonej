import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import axios from "axios";

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
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [withdrawalsOpen, setWithdrawalsOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

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

  const invalidateFundraiserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
    queryClient.invalidateQueries({
      queryKey: ["fundraiser-details", fundraiser.id],
    });
  };

  const handleWithdrawAll = async () => {
    try {
        await axios.post(`/api/fundraisers/${fundraiser.id}/withdraw-all`);
        invalidateFundraiserQueries();
    } catch {
        window.alert('Wystąpił błąd podczas wypłacania środków.');
    } finally {
        setShowFinishConfirmation(false);
    }
  };

  const handleReopen = async () => {
      try {
          await axios.post(`/api/fundraisers/${fundraiser.id}/reopen`);
          invalidateFundraiserQueries();
      } catch (err: any) {
          alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd.');
      }
  };

  const handleReconcile = async () => {
      try {
          await axios.post(`/api/fundraisers/${fundraiser.id}/reconcile`, { note: 'Rozliczenie zbiórki' });
          invalidateFundraiserQueries();
      } catch (err: any) {
          window.alert(err.response?.data?.error || err.response?.data?.message || 'Wystąpił błąd podczas rozliczania zbiórki.');
      } finally {
          setShowFinishConfirmation(false);
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
            {isTreasurer && (
              <div className="grid grid-cols-1 gap-2">
                {fundraiser.status === 'ACTIVE' && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowFinishConfirmation(true)}
                  >
                    Zakończ
                  </Button>
                )}
                {fundraiser.status === 'FINISHED' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReopen}
                  >
                    Wznów
                  </Button>
                )}
              </div>
            )}
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

      {showFinishConfirmation && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', border: '1px solid #ccc', zIndex: 1000, borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0 }}>Zakończ zbiórkę</h4>
            {(fundraiser.currentAmount ?? 0) > 0 ? (
                <>
                    <p>Na koncie zbiórki znajdują się środki. Co chcesz zrobić?</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setShowFinishConfirmation(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px' }}>Anuluj</button>
                        <button onClick={handleReconcile} style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}>Rozlicz</button>
                        <button onClick={handleWithdrawAll} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Wypłać wszystko i zamknij</button>
                    </div>
                </>
            ) : (
                <>
                    <p>Na koncie zbiórki nie ma żadnych środków. Zbiórka zostanie zamknięta i przejdziesz do etapu rozliczania.</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setShowFinishConfirmation(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px' }}>Anuluj</button>
                        <button onClick={handleReconcile} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Rozlicz</button>
                    </div>
                </>
            )}
        </div>
      )}
    </div>
  );
}