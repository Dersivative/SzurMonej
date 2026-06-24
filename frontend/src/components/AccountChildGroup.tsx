import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AddChildDialog } from "@/components/AddChildDialog";
import { ChildCard } from "@/components/ChildCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import type { ChildResponseDTO } from "@/features/users/api/types";

export function AccountChildGroup() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: children = [], isLoading, isError } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
  });

  const handleChildUpdate = (updatedChild: ChildResponseDTO) => {
    queryClient.setQueryData<ChildResponseDTO[]>(["my-children"], (current) =>
      current?.map((child) =>
        child.id === updatedChild.id ? updatedChild : child,
      ) ?? [],
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">Moje dzieci</CardTitle>
              <CardDescription>
                Zarządzaj listą swoich dzieci
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              Dodaj dziecko
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie dzieci...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać listy dzieci.
            </p>
          )}

          {!isLoading && !isError && children.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze dodanych dzieci.
            </p>
          )}

          {!isLoading && !isError && children.length > 0 && (
            <div className="space-y-4">
              {children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  onUpdate={handleChildUpdate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddChildDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
