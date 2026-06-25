import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import {
  RemoveChildFromClassDialog,
  type RemoveChildAction,
} from "@/components/RemoveChildFromClassDialog";
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
import { fetchSchoolClass } from "@/features/classes/api/get-school-class";
import { removeClassMembership } from "@/features/classes/api/remove-class-membership";
import type { ChildResponseDTO } from "@/features/users/api/types";

interface AdminClassChildrenDialogProps {
  classId: number;
  classLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export function AdminClassChildrenDialog({
  classId,
  classLabel,
  open,
  onOpenChange,
}: AdminClassChildrenDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [childToRemove, setChildToRemove] = useState<{
    membershipId: number;
    name: string;
    surname: string;
    action: RemoveChildAction;
  } | null>(null);

  const { data: schoolClass, isLoading } = useQuery({
    queryKey: ["school-class", classId],
    queryFn: () => fetchSchoolClass(classId),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["school-class", classId] });
    queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["all-users-with-children"] });
  };

  const { mutate: removeChild, isPending: isRemoving } = useMutation({
    mutationFn: (membershipId: number) => removeClassMembership(membershipId),
    onSuccess: () => {
      setError(null);
      setChildToRemove(null);
      invalidate();
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się usunąć dziecka z klasy."));
    },
  });

  const children = schoolClass?.children ?? [];

  const openRemoveDialog = (child: ChildResponseDTO, action: RemoveChildAction) => {
    if (child.membershipId == null) {
      return;
    }

    setChildToRemove({
      membershipId: child.membershipId,
      name: child.name,
      surname: child.surname,
      action,
    });
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader className="w-full sm:place-items-stretch">
            <AlertDialogTitle>Uczniowie — {classLabel}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="w-full space-y-4 pt-2 text-left text-foreground">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">Ładowanie...</p>
                )}

                {!isLoading && children.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Brak uczniów w tej klasie.
                  </p>
                )}

                {!isLoading && children.length > 0 && (
                  <ul className="space-y-2">
                    {children.map((child) => {
                      const isPendingRemoval = child.status === "REMOVAL_PENDING";

                      return (
                        <li
                          key={child.id}
                          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {child.name} {child.surname}
                            </p>
                            {isPendingRemoval && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                W trakcie wypisywania
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {!isPendingRemoval && (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isRemoving || child.membershipId == null}
                                onClick={() => openRemoveDialog(child, "remove")}
                              >
                                Usuń z klasy
                              </Button>
                            )}
                            {isPendingRemoval && (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isRemoving || child.membershipId == null}
                                onClick={() => openRemoveDialog(child, "finalize")}
                              >
                                Zakończ wypisanie
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {childToRemove && (
        <RemoveChildFromClassDialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setChildToRemove(null);
            }
          }}
          childName={childToRemove.name}
          childSurname={childToRemove.surname}
          classLabel={classLabel}
          isPending={isRemoving}
          action={childToRemove.action}
          onConfirm={() => removeChild(childToRemove.membershipId)}
        />
      )}
    </>
  );
}
