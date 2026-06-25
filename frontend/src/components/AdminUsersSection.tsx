import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { removeClassMembership } from "@/features/classes/api/remove-class-membership";
import { archiveChild } from "@/features/users/api/archive-child";
import { fetchAllUsersWithChildren } from "@/features/users/api/get-users-all";
import type { ChildResponseDTO } from "@/features/users/api/types";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export function AdminUsersSection() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<number | null>(
    null,
  );
  const [archivingChildId, setArchivingChildId] = useState<number | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["all-users-with-children"],
    queryFn: fetchAllUsersWithChildren,
  });

  const { mutate: removeFromClass, isPending: isRemoving } = useMutation({
    mutationFn: (membershipId: number) => removeClassMembership(membershipId),
    onSuccess: () => {
      setError(null);
      setRemovingMembershipId(null);
      queryClient.invalidateQueries({ queryKey: ["all-users-with-children"] });
      queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
      queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
      queryClient.invalidateQueries({ queryKey: ["school-class"] });
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się usunąć dziecka z klasy."),
      );
      setRemovingMembershipId(null);
    },
  });

  const { mutate: archiveChildMutation, isPending: isArchiving } = useMutation({
    mutationFn: (childId: number) => archiveChild(childId),
    onSuccess: () => {
      setError(null);
      setArchivingChildId(null);
      queryClient.invalidateQueries({ queryKey: ["all-users-with-children"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się zarchiwizować dziecka."));
      setArchivingChildId(null);
    },
  });

  const handleRemove = (child: ChildResponseDTO) => {
    if (child.membershipId == null) {
      return;
    }

    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć ${child.name} ${child.surname} z klasy ${child.schoolClassName ?? ""}?`,
    );
    if (!confirmed) {
      return;
    }

    setRemovingMembershipId(child.membershipId);
    removeFromClass(child.membershipId);
  };

  const handleArchive = (child: ChildResponseDTO) => {
    if (child.schoolClassId != null) {
      setError("Usuń dziecko z klasy przed archiwizacją.");
      return;
    }

    const confirmed = window.confirm(
      `Czy na pewno chcesz zarchiwizować ${child.name} ${child.surname}?`,
    );
    if (!confirmed) {
      return;
    }

    setArchivingChildId(child.id);
    archiveChildMutation(child.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Użytkownicy i dzieci</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Ładowanie użytkowników...</p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Nie udało się pobrać listy użytkowników.
          </p>
        )}

        {!isLoading && !isError && users.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak użytkowników.</p>
        )}

        {!isLoading &&
          !isError &&
          users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border bg-card p-4"
            >
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>

              {user.children.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Brak przypisanych dzieci.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {user.children.map((child) => (
                    <li
                      key={child.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {child.name} {child.surname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {child.schoolClassName
                            ? `Klasa: ${child.schoolClassName}`
                            : "Brak klasy"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {child.schoolClassId != null && child.membershipId != null && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={
                              isRemoving && removingMembershipId === child.membershipId
                            }
                            onClick={() => handleRemove(child)}
                          >
                            {isRemoving && removingMembershipId === child.membershipId
                              ? "Usuwanie..."
                              : "Usuń z klasy"}
                          </Button>
                        )}

                        {child.schoolClassId == null && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isArchiving && archivingChildId === child.id}
                            onClick={() => handleArchive(child)}
                          >
                            {isArchiving && archivingChildId === child.id
                              ? "Archiwizowanie..."
                              : "Archiwizuj"}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
