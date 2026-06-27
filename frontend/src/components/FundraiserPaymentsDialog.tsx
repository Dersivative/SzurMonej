import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useRef, useState } from "react";
import { InsufficientFundraiserFundsAlert } from "@/components/InsufficientFundraiserFundsAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/features/finance/lib/format-money";
import { approveRefundRequest } from "@/features/fundraisers/api/approve-refund-request";
import {
  downloadAttachment,
  previewAttachment,
} from "@/features/fundraisers/api/download-attachment";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";
import { rejectRefundRequest } from "@/features/fundraisers/api/reject-refund-request";
import { uploadAttachment } from "@/features/fundraisers/api/upload-attachment";
import type { FundraiserHistoryEntryDTO } from "@/features/fundraisers/api/types-history";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import {
  getFundraiserAvailableBalance,
  getTotalTreasurerWithdrawnAmount,
  isTreasurerWithdrawalEntry,
} from "@/features/fundraisers/lib/fundraiser-history";
import { formatFundraiserHistoryDescription } from "@/features/fundraisers/lib/history-description";
import {
  getRefundApprovalErrorMessage,
  isInsufficientFundraiserFundsError,
} from "@/features/fundraisers/lib/refund-approval-error";
import { fetchMyChildren } from "@/features/users/api/get-my-children";

interface FundraiserPaymentsDialogProps {
  fundraiserId: number;
  fundraiserTitle: string;
  isTreasurer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(dateString: string): string {
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
  }
  return fallback;
}

function getChildKey(name: string, surname: string): string {
  return `${name}|${surname}`;
}

function getPartyLabel(entry: FundraiserHistoryEntryDTO): string | null {
  if (entry.payerName) {
    return `Od: ${entry.payerName}`;
  }
  if (entry.payeeName) {
    return `Dla: ${entry.payeeName}`;
  }
  return null;
}

function invalidateAfterRefund(
  queryClient: ReturnType<typeof useQueryClient>,
  fundraiserId: number,
) {
  queryClient.invalidateQueries({
    queryKey: ["fundraiser-refund-requests", fundraiserId],
  });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["class-refund-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  queryClient.invalidateQueries({ queryKey: ["my-pending-removals"] });
  queryClient.invalidateQueries({ queryKey: ["treasurer-pending-removals"] });
  queryClient.invalidateQueries({ queryKey: ["fundraiser-details", fundraiserId] });
}

export function FundraiserPaymentsDialog({
  fundraiserId,
  fundraiserTitle,
  isTreasurer,
  open,
  onOpenChange,
}: FundraiserPaymentsDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientFundsOpen, setInsufficientFundsOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    null,
  );

  const {
    data: fundraiserDetails,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
  } = useQuery({
    queryKey: ["fundraiser-details", fundraiserId],
    queryFn: () => fetchFundraiserDetails(fundraiserId),
    enabled: open,
  });

  const {
    data: pendingRefundRequests = [],
    isLoading: isRefundsLoading,
    isError: isRefundsError,
  } = useQuery({
    queryKey: ["fundraiser-refund-requests", fundraiserId],
    queryFn: () => fetchPendingRefundRequests(fundraiserId),
    enabled: open,
  });

  const { data: myChildren = [], isLoading: isMyChildrenLoading } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: open && !isTreasurer,
  });

  const visiblePendingRefunds = useMemo(() => {
    if (isTreasurer) {
      return pendingRefundRequests;
    }

    const myChildKeys = new Set(
      myChildren.map((child) => getChildKey(child.name, child.surname)),
    );

    return pendingRefundRequests.filter((request) =>
      myChildKeys.has(
        getChildKey(
          request.participant.child.name,
          request.participant.child.surname,
        ),
      ),
    );
  }, [isTreasurer, myChildren, pendingRefundRequests]);

  const sortedHistory = useMemo(() => {
    const history = fundraiserDetails?.history ?? [];
    return [...history].sort((left, right) => right.date.localeCompare(left.date));
  }, [fundraiserDetails?.history]);

  const collectedAmount = fundraiserDetails?.currentAmount ?? 0;
  const withdrawnAmount = useMemo(
    () => getTotalTreasurerWithdrawnAmount(fundraiserDetails?.history ?? []),
    [fundraiserDetails?.history],
  );
  const availableBalance = useMemo(
    () => getFundraiserAvailableBalance(fundraiserDetails?.history ?? []),
    [fundraiserDetails?.history],
  );

  const invalidateDetails = () => {
    queryClient.invalidateQueries({
      queryKey: ["fundraiser-details", fundraiserId],
    });
    queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
    queryClient.invalidateQueries({ queryKey: ["all-fundraisers"] });
  };

  const downloadMutation = useMutation({
    mutationFn: (historyId: number) => downloadAttachment(historyId),
    onMutate: (historyId) => {
      setDownloadingId(historyId);
      setError(null);
    },
    onSettled: () => {
      setDownloadingId(null);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się pobrać pliku."),
      );
    },
  });

  const previewMutation = useMutation({
    mutationFn: (historyId: number) => previewAttachment(historyId),
    onMutate: (historyId) => {
      setPreviewingId(historyId);
      setError(null);
    },
    onSettled: () => {
      setPreviewingId(null);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się otworzyć podglądu pliku."),
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ historyId, file }: { historyId: number; file: File }) =>
      uploadAttachment(historyId, file),
    onMutate: ({ historyId }) => {
      setUploadingId(historyId);
      setError(null);
    },
    onSuccess: () => {
      invalidateDetails();
    },
    onSettled: () => {
      setUploadingId(null);
      setSelectedHistoryId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się wgrać pliku."),
      );
    },
  });

  const { mutate: approveRefund, isPending: isApproving } = useMutation({
    mutationFn: (requestId: number) => approveRefundRequest(requestId),
    onSuccess: () => {
      setError(null);
      invalidateAfterRefund(queryClient, fundraiserId);
    },
    onError: (mutationError) => {
      if (isInsufficientFundraiserFundsError(mutationError)) {
        setInsufficientFundsOpen(true);
        return;
      }
      setError(
        getRefundApprovalErrorMessage(
          mutationError,
          "Nie udało się zatwierdzić zwrotu.",
        ),
      );
    },
  });

  const { mutate: rejectRefund, isPending: isRejecting } = useMutation({
    mutationFn: (requestId: number) => rejectRefundRequest(requestId),
    onSuccess: () => {
      setError(null);
      invalidateAfterRefund(queryClient, fundraiserId);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się odrzucić wniosku o zwrot."),
      );
    },
  });

  const isActionPending =
    isApproving ||
    isRejecting ||
    downloadMutation.isPending ||
    previewMutation.isPending ||
    uploadMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setSelectedHistoryId(null);
    }
    onOpenChange(nextOpen);
  };

  const handlePickFile = (historyId: number) => {
    setSelectedHistoryId(historyId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || selectedHistoryId == null) {
      return;
    }

    uploadMutation.mutate({ historyId: selectedHistoryId, file });
  };

  const isLoading = isDetailsLoading || isRefundsLoading || isMyChildrenLoading;
  const isError = isDetailsError || isRefundsError;
  const hasContent =
    visiblePendingRefunds.length > 0 || sortedHistory.length > 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader className="w-full sm:place-items-stretch">
          <AlertDialogTitle>Historia — {fundraiserTitle}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
              )}

              {isError && (
                <p className="text-sm text-destructive">
                  Nie udało się pobrać listy wpłat.
                </p>
              )}

              {!isLoading && !isError && fundraiserDetails && (
                <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Zebrano</p>
                    <p className="text-base font-semibold">
                      {formatMoney(collectedAmount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Wypłacono</p>
                    <p className="text-base font-semibold">
                      {formatMoney(withdrawnAmount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Zostało</p>
                    <p className="text-base font-semibold">
                      {formatMoney(availableBalance)}
                    </p>
                  </div>
                </div>
              )}

              {!isLoading && !isError && !hasContent && (
                <p className="text-sm text-muted-foreground">
                  Brak wpłat i operacji na tej zbiórce.
                </p>
              )}

              {!isLoading && !isError && hasContent && (
                <ul className="w-full space-y-2">
                  {visiblePendingRefunds.map((request) => (
                    <PendingRefundRow
                      key={request.id}
                      request={request}
                      isTreasurer={isTreasurer}
                      isActionPending={isActionPending}
                      onApprove={() => approveRefund(request.id)}
                      onReject={() => rejectRefund(request.id)}
                    />
                  ))}
                  {sortedHistory.map((entry) => (
                    <PaymentHistoryRow
                      key={`${entry.type}-${entry.id}`}
                      entry={entry}
                      isTreasurer={isTreasurer}
                      isDownloading={downloadingId === entry.id}
                      isPreviewing={previewingId === entry.id}
                      isUploading={uploadingId === entry.id}
                      onDownload={() => downloadMutation.mutate(entry.id)}
                      onPreview={() => previewMutation.mutate(entry.id)}
                      onPickFile={() => handlePickFile(entry.id)}
                    />
                  ))}
                </ul>
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

    <InsufficientFundraiserFundsAlert
      open={insufficientFundsOpen}
      onOpenChange={setInsufficientFundsOpen}
    />
    </>
  );
}

interface PendingRefundRowProps {
  request: RefundRequestResponseDTO;
  isTreasurer: boolean;
  isActionPending: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function PendingRefundRow({
  request,
  isTreasurer,
  isActionPending,
  onApprove,
  onReject,
}: PendingRefundRowProps) {
  const childName = `${request.participant.child.name} ${request.participant.child.surname}`;

  return (
    <li className="flex w-full flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{childName}</p>
        <p className="text-xs text-muted-foreground">
          Wnioskodawca: {request.requester.fullName}
        </p>
        <p className="text-xs text-muted-foreground">
          Kwota zwrotu: {formatMoney(request.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          Złożono: {formatDate(request.requestedAt)}
        </p>
        <Badge variant="secondary" className="text-xs">
          Oczekuje na zatwierdzenie
        </Badge>
      </div>

      {isTreasurer && (
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isActionPending}
            onClick={onApprove}
          >
            Zatwierdź zwrot
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionPending}
            onClick={onReject}
          >
            Odrzuć
          </Button>
        </div>
      )}
    </li>
  );
}

interface PaymentHistoryRowProps {
  entry: FundraiserHistoryEntryDTO;
  isTreasurer: boolean;
  isDownloading: boolean;
  isPreviewing: boolean;
  isUploading: boolean;
  onDownload: () => void;
  onPreview: () => void;
  onPickFile: () => void;
}

function PaymentHistoryRow({
  entry,
  isTreasurer,
  isDownloading,
  isPreviewing,
  isUploading,
  onDownload,
  onPreview,
  onPickFile,
}: PaymentHistoryRowProps) {
  const partyLabel = getPartyLabel(entry);
  const showAttachmentActions = isTreasurerWithdrawalEntry(entry);
  const isAttachmentActionPending = isDownloading || isPreviewing || isUploading;

  return (
    <li className="flex w-full flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{entry.type}</p>
        <p className="text-sm text-muted-foreground">
          {formatFundraiserHistoryDescription(entry.description)}
        </p>
        {partyLabel && (
          <p className="text-xs text-muted-foreground">{partyLabel}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDateTime(entry.date)}
        </p>
        {showAttachmentActions && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {entry.hasAttachment ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isAttachmentActionPending}
                  onClick={onPreview}
                >
                  {isPreviewing ? "Otwieranie..." : "Podgląd"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isAttachmentActionPending}
                  onClick={onDownload}
                >
                  {isDownloading ? "Pobieranie..." : "Pobierz"}
                </Button>
              </>
            ) : isTreasurer ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isAttachmentActionPending}
                onClick={onPickFile}
              >
                {isUploading ? "Wgrywanie..." : "Wybierz plik"}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Brak pliku</span>
            )}
          </div>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold sm:text-right">
        {formatMoney(entry.amount)}
      </p>
    </li>
  );
}
