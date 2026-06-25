import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useRef, useState } from "react";
import { WithdrawFromFundraiserDialog } from "@/components/WithdrawFromFundraiserDialog";
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
import { downloadAttachment } from "@/features/fundraisers/api/download-attachment";
import { fetchFundraiserDetails } from "@/features/fundraisers/api/get-fundraiser-details";
import { uploadAttachment } from "@/features/fundraisers/api/upload-attachment";
import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import type { FundraiserHistoryEntryDTO } from "@/features/fundraisers/api/types-history";
import {
  formatHistoryDateTime,
  getFundraiserAvailableBalance,
  getTotalTreasurerWithdrawnAmount,
  getTreasurerWithdrawalEntries,
} from "@/features/fundraisers/lib/fundraiser-history";

interface FundraiserWithdrawalsDialogProps {
  fundraiser: FundraiserResponseDTO;
  isTreasurer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function WithdrawalRow({
  entry,
  isTreasurer,
  isDownloading,
  isUploading,
  onDownload,
  onPickFile,
}: {
  entry: FundraiserHistoryEntryDTO;
  isTreasurer: boolean;
  isDownloading: boolean;
  isUploading: boolean;
  onDownload: () => void;
  onPickFile: () => void;
}) {
  return (
    <li className="flex w-full flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{entry.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatHistoryDateTime(entry.date)}
        </p>
        {entry.payeeName && (
          <p className="text-xs text-muted-foreground">
            Odbiorca: {entry.payeeName}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="text-sm font-semibold">{formatMoney(entry.amount)}</p>
        {entry.hasAttachment ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDownloading || isUploading}
            onClick={onDownload}
          >
            Pobierz
          </Button>
        ) : isTreasurer ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDownloading || isUploading}
            onClick={onPickFile}
          >
            {isUploading ? "Wgrywanie..." : "Wybierz plik"}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Brak pliku</span>
        )}
      </div>
    </li>
  );
}

export function FundraiserWithdrawalsDialog({
  fundraiser,
  isTreasurer,
  open,
  onOpenChange,
}: FundraiserWithdrawalsDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    null,
  );

  const {
    data: fundraiserDetails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fundraiser-details", fundraiser.id],
    queryFn: () => fetchFundraiserDetails(fundraiser.id),
    enabled: open,
  });

  const withdrawals = useMemo(
    () => getTreasurerWithdrawalEntries(fundraiserDetails?.history ?? []),
    [fundraiserDetails?.history],
  );

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
      queryKey: ["fundraiser-details", fundraiser.id],
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (
      !downloadMutation.isPending &&
      !uploadMutation.isPending &&
      !withdrawOpen
    ) {
      if (!nextOpen) {
        setError(null);
        setSelectedHistoryId(null);
      }
      onOpenChange(nextOpen);
    }
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

  const isActionPending =
    downloadMutation.isPending || uploadMutation.isPending;

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <AlertDialogTitle className="text-left">
                Wypłaty — {fundraiser.title}
              </AlertDialogTitle>
              {isTreasurer && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setWithdrawOpen(true)}
                >
                  Wypłać
                </Button>
              )}
            </div>
            <AlertDialogDescription asChild>
              <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">Ładowanie...</p>
                )}

                {isError && (
                  <p className="text-sm text-destructive">
                    Nie udało się pobrać historii wypłat.
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

                {!isLoading && !isError && withdrawals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Brak wypłat w tej zbiórce.
                  </p>
                )}

                {!isLoading && !isError && withdrawals.length > 0 && (
                  <ul className="w-full space-y-2">
                    {withdrawals.map((entry) => (
                      <WithdrawalRow
                        key={entry.id}
                        entry={entry}
                        isTreasurer={isTreasurer}
                        isDownloading={downloadingId === entry.id}
                        isUploading={uploadingId === entry.id}
                        onDownload={() => downloadMutation.mutate(entry.id)}
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
            <AlertDialogCancel disabled={isActionPending}>
              Zamknij
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isTreasurer && (
        <WithdrawFromFundraiserDialog
          fundraiser={fundraiser}
          availableBalance={availableBalance}
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          onSuccess={() => {
            invalidateDetails();
          }}
        />
      )}
    </>
  );
}
