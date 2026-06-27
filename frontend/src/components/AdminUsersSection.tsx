import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { removeClassMembership } from "@/features/classes/api/remove-class-membership";
import { approveUser } from "@/features/users/api/approve-user";
import { archiveChild } from "@/features/users/api/archive-child";
import { fetchUnapprovedUsers } from "@/features/users/api/get-unapproved-users";
import { fetchAllUsersWithChildren } from "@/features/users/api/get-users-all";
import type { ChildResponseDTO } from "@/features/users/api/types";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (data && typeof data === "object") {
      const message = (data as { message?: string }).message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }
  return fallback;
}

function getUserDisplayName(user: {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (user.fullName?.trim()) {
    return user.fullName;
  }

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

export function AdminUsersSection() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<number | null>(
    null,
  );
  const [archivingChildId, setArchivingChildId] = useState<number | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);

  const {
    data: unapprovedUsers = [],
    isLoading: isLoadingUnapproved,
    isError: isUnapprovedError,
  } = useQuery({
    queryKey: ["unapproved-users"],
    queryFn: fetchUnapprovedUsers,
  });

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

  const { mutate: approveUserMutation, isPending: isApproving } = useMutation({
    mutationFn: (userId: number) => approveUser(userId),
    onSuccess: () => {
      setApprovalError(null);
      setApprovingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["unapproved-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-users-with-children"] });
    },
    onError: (mutationError) => {
      setApprovalError(
        getErrorMessage(mutationError, "Nie udało się zaakceptować użytkownika."),
      );
      setApprovingUserId(null);
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

  const handleApprove = (userId: number) => {
    setApprovalError(null);
    setApprovingUserId(userId);
    approveUserMutation(userId);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Niezaakceptowani użytkownicy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingUnapproved && (
            <p className="text-sm text-muted-foreground">
              Ładowanie oczekujących kont...
            </p>
          )}

          {isUnapprovedError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać listy niezaakceptowanych użytkowników.
            </p>
          )}

          {!isLoadingUnapproved &&
            !isUnapprovedError &&
            unapprovedUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Brak kont oczekujących na akceptację.
              </p>
            )}

          {!isLoadingUnapproved &&
            !isUnapprovedError &&
            unapprovedUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{getUserDisplayName(user)}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isApproving && approvingUserId === user.id}
                  onClick={() => handleApprove(user.id)}
                >
                  {isApproving && approvingUserId === user.id
                    ? "Akceptowanie..."
                    : "Akceptuj"}
                </Button>
              </div>
            ))}
          {approvalError && (
            <p className="text-sm text-destructive">{approvalError}</p>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
