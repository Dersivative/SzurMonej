import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClassCard } from "@/components/ClassCard";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { fetchAllSchoolClasses } from "@/features/classes/api/get-all-school-classes";
import { fetchMyAccessibleClasses } from "@/features/classes/api/get-my-accessible-classes";
import { fetchMyPendingClassApplication } from "@/features/classes/api/get-my-pending-class-application";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";
import { cn } from "@/lib/utils";
import type { SchoolClassResponseDTO } from "@/features/classes/api/types";

type ClassTab = "moje" | "wszystkie";

const classTabs = [
  { id: "moje" as const, label: "Moje klasy" },
  { id: "wszystkie" as const, label: "Wszystkie klasy" },
];

export function ClassPage() {
  const [activeTab, setActiveTab] = useState<ClassTab>("moje");
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const {
    data: myClasses = [],
    isLoading: isMyClassesLoading,
    isError: isMyClassesError,
  } = useQuery({
    queryKey: ["my-accessible-classes"],
    queryFn: fetchMyAccessibleClasses,
    enabled: activeTab === "moje",
  });

  const {
    data: allClasses = [],
    isLoading: isAllClassesLoading,
    isError: isAllClassesError,
  } = useQuery({
    queryKey: ["all-school-classes"],
    queryFn: fetchAllSchoolClasses,
    enabled: activeTab === "wszystkie",
  });

  const {
    data: pendingApplication = null,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = useQuery({
    queryKey: ["my-pending-class-application"],
    queryFn: fetchMyPendingClassApplication,
  });

  const isLoading =
    activeTab === "moje"
      ? isMyClassesLoading || isPendingLoading
      : isAllClassesLoading;

  const isError =
    activeTab === "moje"
      ? isMyClassesError || isPendingError
      : isAllClassesError;

  const hasPendingApplication = pendingApplication !== null;
  const displayedClasses = activeTab === "moje" ? myClasses : allClasses;
  const visibleItemCount =
    displayedClasses.length + (activeTab === "moje" && hasPendingApplication ? 1 : 0);
  const isEmpty = activeTab === "moje" ? visibleItemCount === 0 : allClasses.length === 0;

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

      <Menubar className="h-auto w-fit gap-1 border-0 p-0">
        {classTabs.map(({ id, label }) => {
          const active = activeTab === id;

          return (
            <MenubarMenu key={id}>
              <MenubarTrigger
                className={cn(
                  active ? navLinkActiveClassName : navLinkInactiveClassName,
                  active ? "aria-expanded:bg-active" : "aria-expanded:bg-hover",
                )}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </MenubarTrigger>
            </MenubarMenu>
          );
        })}
      </Menubar>

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
              {activeTab === "moje"
                ? "Nie masz jeszcze żadnych klas."
                : "Brak klas w systemie."}
            </p>
          )}

          {!isLoading && !isError && !isEmpty && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                visibleItemCount > 1 && "lg:grid-cols-2",
              )}
            >
              {activeTab === "moje" && pendingApplication && (
                <ClassCard pendingLabel={pendingApplication.proposedName} />
              )}

              {displayedClasses.map((schoolClass) => (
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
