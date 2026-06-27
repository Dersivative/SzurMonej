import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { partitionParticipants } from "@/features/finance/lib/fundraiser-payment";
import { canRemoveParticipant } from "@/features/fundraisers/lib/admin-fundraiser-permissions";
import { addFundraiserParticipant } from "@/features/fundraisers/api/add-fundraiser-participant";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { removeFundraiserParticipant } from "@/features/fundraisers/api/remove-fundraiser-participant";
import { payFundraiserDebt } from "@/features/fundraisers/api/pay-fundraiser-debt";
import type {
  FundraiserResponseDTO,
  ParticipantResponseDTO,
} from "@/features/fundraisers/api/types";
import type { ChildResponseDTO } from "@/features/users/api/types";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import { formatMoney } from "@/features/finance/lib/format-money";

interface FundraiserParticipantsDialogProps {
  fundraiserId: number;
  fundraiserTitle: string;
  isTreasurer: boolean;
  isAdmin?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (fundraiser: FundraiserResponseDTO) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return fallback;
}

function getParticipantName(participant: ParticipantResponseDTO): string {
  if (participant.childFirstName || participant.childSurname) {
    return `${participant.childFirstName} ${participant.childSurname}`.trim();
  }
  return participant.childName;
}

function getChildName(child: ChildResponseDTO): string {
  return `${child.name} ${child.surname}`.trim();
}

function canManageFundraiserParticipants(status: FundraiserResponseDTO["status"]): boolean {
  return status === "ACTIVE";
}

function canAddChild(
  child: ChildResponseDTO,
  isTreasurer: boolean,
  myChildIds: Set<number>,
): boolean {
  return isTreasurer || myChildIds.has(child.id);
}

function invalidateParticipantQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
) {
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-details", fundraiserId],
  });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-refund-requests", fundraiserId] });
}

export function FundraiserParticipantsDialog({
  fundraiserId,
  fundraiserTitle,
  isTreasurer,
  isAdmin = false,
  open,
  onOpenChange,
  onUpdate,
}: FundraiserParticipantsDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingChildId, setPendingChildId] = useState<number | null>(null);
  const [pendingRemove, setPendingRemove] =
    useState<ParticipantResponseDTO | null>(null);

  const {
    data: fundraiserDetails,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
  } = useQuery({
    queryKey: ["fundraiser-details", fundraiserId],
    queryFn: () => fetchFundraiserDetails(fundraiserId),
    enabled: open,
  });

  const { data: myChildren = [], isLoading: isMyChildrenLoading } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: open,
  });

  const myChildIds = useMemo(
    () => myChildren.map((child) => child.id),
    [myChildren],
  );

  const myChildIdSet = useMemo(() => new Set(myChildIds), [myChildIds]);

  const participants = fundraiserDetails?.participants ?? [];
  const { mine: myParticipants, others: otherParticipants } = useMemo(
    () => partitionParticipants(participants, myChildIds),
    [participants, myChildIds],
  );
  const nonParticipants = fundraiserDetails?.nonParticipants ?? [];
  const canManage = canManageFundraiserParticipants(
    fundraiserDetails?.status ?? "ACTIVE",
  );

  const addableChildren = useMemo(
    () =>
      nonParticipants.filter((child) =>
        canAddChild(child, isTreasurer, myChildIdSet),
      ),
    [isTreasurer, myChildIdSet, nonParticipants],
  );

  const handleMutationSuccess = (updatedFundraiser?: FundraiserResponseDTO) => {
    setError(null);
    setPendingChildId(null);
    invalidateParticipantQueries(queryClient, fundraiserId);
    if (updatedFundraiser) {
      onUpdate?.(updatedFundraiser);
    }
  };

  const { mutate: addParticipant, isPending: isAdding } = useMutation({
    mutationFn: (childId: number) =>
      addFundraiserParticipant(fundraiserId, childId),
    onSuccess: (updatedFundraiser) => {
      handleMutationSuccess(updatedFundraiser);
    },
    onError: (mutationError) => {
      setPendingChildId(null);
      setError(
        getErrorMessage(
          mutationError,
          "Nie udało się dodać dziecka do zbiórki.",
        ),
      );
    },
  });

  const { mutate: removeParticipant, isPending: isRemoving } = useMutation({
    mutationFn: (childId: number) =>
      removeFundraiserParticipant(fundraiserId, childId),
    onSuccess: () => {
      setPendingRemove(null);
      handleMutationSuccess();
    },
    onError: (mutationError) => {
      setPendingChildId(null);
      setPendingRemove(null);
      setError(
        getErrorMessage(
          mutationError,
          "Nie udało się usunąć dziecka ze zbiórki.",
        ),
      );
    },
  });

  const { mutate: payDebt, isPending: isPayingDebt } = useMutation({
    mutationFn: (childId: number) => payFundraiserDebt(fundraiserId, childId),
    onSuccess: () => {
      handleMutationSuccess();
    },
    onError: (mutationError) => {
      setPendingChildId(null);
      setError(
        getErrorMessage(mutationError, "Nie udało się spłacić długu."),
      );
    },
  });

  const isActionPending = isAdding || isRemoving || isPayingDebt;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isActionPending && !nextOpen) {
      setError(null);
      setPendingChildId(null);
      setPendingRemove(null);
    }
    if (!isActionPending) {
      onOpenChange(nextOpen);
    }
  };

  const handleAddChild = (childId: number) => {
    setPendingChildId(childId);
    addParticipant(childId);
  };

  const handleRemoveParticipant = (participant: ParticipantResponseDTO) => {
    setError(null);
    setPendingRemove(participant);
  };

  const handlePayDebt = (childId: number) => {
    setPendingChildId(childId);
    payDebt(childId);
  };

  const confirmRemoveParticipant = () => {
    if (!pendingRemove) {
      return;
    }

    setPendingChildId(pendingRemove.childId);
    removeParticipant(pendingRemove.childId);
  };

  const isLoading = isDetailsLoading || isMyChildrenLoading;
  const isError = isDetailsError;
  const hasContent = participants.length > 0 || addableChildren.length > 0;

  const renderParticipantRow = (participant: ParticipantResponseDTO) => (
    <ParticipantRow
      key={participant.childId}
      participant={participant}
      canManage={canManage}
      canRemove={canRemoveParticipant(
        participant,
        isTreasurer,
        isAdmin,
        myChildIdSet,
      )}
      isMyChild={myChildIdSet.has(participant.childId)}
      isReconciling={fundraiserDetails?.status === "RECONCILING"}
      isActionPending={isActionPending}
      isPending={pendingChildId === participant.childId}
      onRemove={() => handleRemoveParticipant(participant)}
      onPayDebt={() => handlePayDebt(participant.childId)}
    />
  );

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader className="w-full sm:place-items-stretch">
          <AlertDialogTitle>Uczestnicy — {fundraiserTitle}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
              )}

              {isError && (
                <p className="text-sm text-destructive">
                  Nie udało się pobrać listy uczestników.
                </p>
              )}

              {!isLoading && !isError && !hasContent && (
                <p className="text-sm text-muted-foreground">
                  Brak uczestników w tej zbiórce.
                </p>
              )}

              {!isLoading && !isError && participants.length > 0 && (
                <section className="space-y-4">
                  {myParticipants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Moje dzieci
                      </p>
                      <ul className="space-y-2">
                        {myParticipants.map(renderParticipantRow)}
                      </ul>
                    </div>
                  )}

                  {myParticipants.length > 0 && otherParticipants.length > 0 && (
                    <div
                      role="separator"
                      className="border-t border-border"
                    />
                  )}

                  {otherParticipants.length > 0 && (
                    <ul className="space-y-2">
                      {otherParticipants.map(renderParticipantRow)}
                    </ul>
                  )}
                </section>
              )}

              {!isLoading &&
                !isError &&
                canManage &&
                addableChildren.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Dzieci możliwe do dodania ({addableChildren.length})
                    </h3>
                    <ScrollArea className="max-h-48 rounded-lg border">
                      <ul className="space-y-2 p-2">
                        {addableChildren.map((child) => (
                          <AddableChildRow
                            key={child.id}
                            child={child}
                            isActionPending={isActionPending}
                            isPending={pendingChildId === child.id}
                            onAdd={() => handleAddChild(child.id)}
                          />
                        ))}
                      </ul>
                    </ScrollArea>
                  </section>
                )}

              {!isLoading && !isError && !canManage && (
                <p className="text-sm text-muted-foreground">
                  Zmiana składu uczestników jest możliwa tylko dla aktywnych
                  zbiórek.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isActionPending}>Zamknij</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

      <AlertDialog
        open={pendingRemove != null}
        onOpenChange={(nextOpen) => {
          if (!isRemoving && !nextOpen) {
            setPendingRemove(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove && pendingRemove.totalContribution > 0 ? (
                <>
                  Czy na pewno chcesz usunąć{" "}
                  <strong>{getParticipantName(pendingRemove)}</strong> ze
                  zbiórki? Spowoduje to utworzenie prośby o zwrot wpłaconych
                  środków.
                </>
              ) : (
                <>
                  Czy na pewno chcesz usunąć{" "}
                  <strong>
                    {pendingRemove
                      ? getParticipantName(pendingRemove)
                      : "to dziecko"}
                  </strong>{" "}
                  ze zbiórki?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving || pendingRemove == null}
              onClick={(event) => {
                event.preventDefault();
                confirmRemoveParticipant();
              }}
            >
              {isRemoving ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ParticipantRowProps {
  participant: ParticipantResponseDTO;
  canManage: boolean;
  canRemove: boolean;
  isMyChild: boolean;
  isReconciling: boolean;
  isActionPending: boolean;
  isPending: boolean;
  onRemove: () => void;
  onPayDebt: () => void;
}

function ParticipantRow({
  participant,
  canManage,
  canRemove,
  isMyChild,
  isReconciling,
  isActionPending,
  isPending,
  onRemove,
  onPayDebt,
}: ParticipantRowProps) {
  const isPendingRemoval = participant.status === "REMOVAL_PENDING";
  const hasDebt = participant.debt != null && participant.debt > 0;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{getParticipantName(participant)}</p>
        {isPendingRemoval && (
          <Badge variant="secondary" className="text-xs">
            Oczekuje na zwrot
          </Badge>
        )}
        {isReconciling && (
          <div className="flex gap-2 text-xs">
            {hasDebt && (
              <p className="font-medium text-destructive">
                Dług: {formatMoney(participant.debt)}
              </p>
            )}
            {participant.credit != null && participant.credit > 0 && (
              <p className="font-medium text-green-600">
                Nadpłata: {formatMoney(participant.credit)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isReconciling && isMyChild && hasDebt && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionPending}
            onClick={onPayDebt}
          >
            {isPending ? "Spłacanie..." : "Spłać dług"}
          </Button>
        )}
        {canManage && canRemove && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionPending}
            onClick={onRemove}
          >
            {isPending ? "Usuwanie..." : "Usuń"}
          </Button>
        )}
      </div>
    </li>
  );
}

interface AddableChildRowProps {
  child: ChildResponseDTO;
  isActionPending: boolean;
  isPending: boolean;
  onAdd: () => void;
}

function AddableChildRow({
  child,
  isActionPending,
  isPending,
  onAdd,
}: AddableChildRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <p className="min-w-0 flex-1 text-sm font-medium">{getChildName(child)}</p>
      <Button
        type="button"
        size="sm"
        disabled={isActionPending}
        onClick={onAdd}
      >
        {isPending ? "Dodawanie..." : "Dodaj"}
      </Button>
    </li>
  );
}