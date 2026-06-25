import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClassCard } from "@/components/ClassCard";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchMyAccessibleClasses } from "@/features/classes/api/get-my-accessible-classes";
import { fetchMyPendingClassApplication } from "@/features/classes/api/get-my-pending-class-application";
import { useAuthStore } from "@/features/auth/store/authStore";
import { cn } from "@/lib/utils";
import type { SchoolClassResponseDTO } from "@/features/classes/api/types";

export function ClassPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const {
    data: myClasses = [],
    isLoading: isMyClassesLoading,
    isError: isMyClassesError,
  } = useQuery({
    queryKey: ["my-accessible-classes"],
    queryFn: fetchMyAccessibleClasses,
  });

  const {
    data: pendingApplication = null,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = useQuery({
    queryKey: ["my-pending-class-application"],
    queryFn: fetchMyPendingClassApplication,
  });

  const isLoading = isMyClassesLoading || isPendingLoading;
  const isError = isMyClassesError || isPendingError;
  const hasPendingApplication = pendingApplication !== null;
  const visibleItemCount =
    myClasses.length + (hasPendingApplication ? 1 : 0);
  const isEmpty = visibleItemCount === 0;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Klasy</h1>
          <p className="text-muted-foreground">
            Zarządzaj klasami i uczniami
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11 px-5 text-base"
          onClick={() => setDialogOpen(true)}
          disabled={hasPendingApplication}
        >
          Utwórz klasę
        </Button>
      </header>

      <Card>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Ładowanie klas...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać listy klas.
            </p>
          )}

          {!isLoading && !isError && isEmpty && (
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze żadnych klas.
            </p>
          )}

          {!isLoading && !isError && !isEmpty && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                visibleItemCount > 1 && "lg:grid-cols-2",
              )}
            >
              {pendingApplication && (
                <ClassCard pendingLabel={pendingApplication.proposedName} />
              )}

              {myClasses.map((schoolClass) => (
                <ClassListItem
                  key={schoolClass.id}
                  schoolClass={schoolClass}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClassDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}

interface ClassListItemProps {
  schoolClass: SchoolClassResponseDTO;
  currentUserId: number | undefined;
}

function ClassListItem({ schoolClass, currentUserId }: ClassListItemProps) {
  return (
    <ClassCard
      schoolClass={schoolClass}
      isTreasurer={
        currentUserId != null && schoolClass.treasurer?.id === currentUserId
      }
    />
  );
}
