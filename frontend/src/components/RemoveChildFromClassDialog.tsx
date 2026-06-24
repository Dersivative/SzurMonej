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

export type RemoveChildAction = "remove" | "withdraw" | "finalize";

interface RemoveChildFromClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childName: string;
  childSurname: string;
  classLabel: string;
  isPending: boolean;
  action?: RemoveChildAction;
  onConfirm: () => void;
}

const copy = {
  remove: {
    title: "Usunąć dziecko z klasy?",
    description: (name: string, surname: string, classLabel: string) =>
      `Czy na pewno chcesz usunąć ${name} ${surname} z klasy ${classLabel}?`,
    confirm: "Usuń",
    pending: "Usuwanie...",
  },
  withdraw: {
    title: "Wypisać dziecko z klasy?",
    description: (name: string, surname: string, classLabel: string) =>
      `Czy na pewno chcesz wypisać ${name} ${surname} z klasy ${classLabel}?`,
    confirm: "Wypisz",
    pending: "Wypisywanie...",
  },
  finalize: {
    title: "Zakończyć wypisywanie dziecka?",
    description: (name: string, surname: string, classLabel: string) =>
      `Czy na pewno chcesz zakończyć wypisywanie ${name} ${surname} z klasy ${classLabel}?`,
    confirm: "Zakończ wypisanie",
    pending: "Zapisywanie...",
  },
} as const;

export function RemoveChildFromClassDialog({
  open,
  onOpenChange,
  childName,
  childSurname,
  classLabel,
  isPending,
  action = "remove",
  onConfirm,
}: RemoveChildFromClassDialogProps) {
  const labels = copy[action];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.description(childName, childSurname, classLabel)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? labels.pending : labels.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
