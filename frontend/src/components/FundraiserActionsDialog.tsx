import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface FundraiserActionsDialogProps {
  fundraiserTitle: string;
  isTreasurer: boolean;
  showRefundRequest: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentsClick: () => void;
  onWithdrawClick: () => void;
  onRefundRequestClick: () => void;
}

export function FundraiserActionsDialog({
  fundraiserTitle,
  isTreasurer,
  showRefundRequest,
  open,
  onOpenChange,
  onPaymentsClick,
  onWithdrawClick,
  onRefundRequestClick,
}: FundraiserActionsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Opcje zbiórki</AlertDialogTitle>
          <AlertDialogDescription>
            {isTreasurer
              ? `Zarządzaj zbiórką „${fundraiserTitle}”.`
              : `Przeglądaj zbiórkę „${fundraiserTitle}”.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onOpenChange(false);
              onPaymentsClick();
            }}
          >
            Lista wpłat
          </Button>

          {showRefundRequest && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                onRefundRequestClick();
              }}
            >
              Prośba o zwrot
            </Button>
          )}

          {isTreasurer && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onOpenChange(false);
                  onWithdrawClick();
                }}
              >
                Wypłata
              </Button>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Zamknij</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
