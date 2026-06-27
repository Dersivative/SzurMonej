import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { INSUFFICIENT_FUNDRAISER_FUNDS_MESSAGE } from "@/features/fundraisers/lib/refund-approval-error";

interface InsufficientFundraiserFundsAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsufficientFundraiserFundsAlert({
  open,
  onOpenChange,
}: InsufficientFundraiserFundsAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Brak środków w zbiórce</AlertDialogTitle>
          <AlertDialogDescription>
            {INSUFFICIENT_FUNDRAISER_FUNDS_MESSAGE}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Rozumiem</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
