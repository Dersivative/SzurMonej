import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CreateFundraiserDialog } from "@/components/CreateFundraiserDialog";
import { FundraiserApplicationCard } from "@/components/FundraiserApplicationCard";
import { FundraisingCard } from "@/components/FundraisingCard";
import { PendingFundraiserApplicationCard } from "@/components/PendingFundraiserApplicationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { fetchClassesForFundraiserCreation } from "@/features/fundraisers/api/get-classes-for-fundraiser-creation";
import { fetchMyFundraisers } from "@/features/fundraisers/api/get-my-fundraisers";
import type {
  FundraiserApplicationListItemDTO,
  FundraiserResponseDTO,
  MyFundraisersResult,
} from "@/features/fundraisers/api/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  navLinkActiveClassName,
  navLinkInactiveClassName,
} from "@/lib/nav-link";
import { cn } from "@/lib/utils";

type FundraisingTab = "aktywne" | "rozliczenie" | "oczekujace" | "zakonczone";

const fundraisingTabs = [
  { id: "aktywne" as const, label: "Aktywne" },
  { id: "rozliczenie" as const, label: "Rozliczenie" },
  { id: "oczekujace" as const, label: "Oczekujące" },
  { id: "zakonczone" as const, label: "Zakończone" },
];

function sortFundraisersByStartedAt(
  fundraisers: FundraiserResponseDTO[],
): FundraiserResponseDTO[] {
  return [...fundraisers].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

function getEmptyMessage(tab: FundraisingTab): string {
  switch (tab) {
    case "aktywne":
      return "Nie masz jeszcze żadnych aktywnych zbiórek.";
    case "rozliczenie":
      return "Brak zbiórek w trakcie rozliczania.";
    case "oczekujace":
      return "Brak zbiórek oczekujących na zatwierdzenie.";
    case "zakonczone":
      return "Brak zakończonych zbiórek.";
  }
}

function isFundraiserTreasurer(
  fundraiser: FundraiserResponseDTO,
  userId?: number,
): boolean {
  if (!userId) {
    return false;
  }

  return fundraiser.treasurer?.id === userId;
}

function isApplicationTreasurer(
  application: FundraiserApplicationListItemDTO,
  treasurerClassIds: Set<number>,
): boolean {
  return (
    application.classId != null && treasurerClassIds.has(application.classId)
  );
}

export function FundraisingPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FundraisingTab>("aktywne");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: availableClasses = [] } = useQuery({
    queryKey: ["classes-for-fundraiser-creation"],
    queryFn: fetchClassesForFundraiserCreation,
  });

  const {
    data: fundraisersData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-fundraisers", user?.id],
    queryFn: () => fetchMyFundraisers(user!.id),
    enabled: Boolean(user),
  });

  const fundraisers = fundraisersData?.fundraisers ?? [];
  const pendingApplications = fundraisersData?.pendingApplications ?? [];
  const canCreateFundraiser = availableClasses.length > 0;

  const treasurerClassIds = useMemo(
    () =>
      new Set(
        availableClasses
          .filter((schoolClass) => schoolClass.mode === "treasurer")
          .map((schoolClass) => schoolClass.id),
      ),
    [availableClasses],
  );

  const activeFundraisers = useMemo(
    () =>
      sortFundraisersByStartedAt(
        fundraisers.filter((fundraiser) => fundraiser.status === "ACTIVE"),
      ),
    [fundraisers],
  );

  const reconcilingFundraisers = useMemo(
    () =>
      sortFundraisersByStartedAt(
        fundraisers.filter((fundraiser) => fundraiser.status === "RECONCILING"),
      ),
    [fundraisers],
  );

  const finishedFundraisers = useMemo(
    () =>
      sortFundraisersByStartedAt(
        fundraisers.filter((fundraiser) => fundraiser.status === "FINISHED"),
      ),
    [fundraisers],
  );

  const sortedPendingApplications = useMemo(
    () =>
      [...pendingApplications].sort((left, right) =>
        (right.requestedAt ?? "").localeCompare(left.requestedAt ?? ""),
      ),
    [pendingApplications],
  );

  const visibleFundraisers =
    activeTab === "aktywne"
      ? activeFundraisers
      : activeTab === "rozliczenie"
        ? reconcilingFundraisers
        : activeTab === "zakonczone"
          ? finishedFundraisers
          : [];

  const visibleItemCount =
    activeTab === "oczekujace"
      ? sortedPendingApplications.length
      : visibleFundraisers.length;

  const handleFundraiserUpdate = (updatedFundraiser: FundraiserResponseDTO) => {
    queryClient.setQueryData<MyFundraisersResult>(
      ["my-fundraisers", user?.id],
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          fundraisers: current.fundraisers.map((fundraiser) =>
            fundraiser.id === updatedFundraiser.id
              ? updatedFundraiser
              : fundraiser,
          ),
        };
      },
    );
  };

  const isEmpty = !isLoading && !isError && visibleItemCount === 0;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Zbiórki</h1>
          <p className="text-muted-foreground">
            Twórz i zarządzaj zbiórkami klasowymi
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11 px-5 text-base"
          onClick={() => setDialogOpen(true)}
          disabled={!canCreateFundraiser}
        >
          Utwórz zbiórkę
        </Button>
      </header>

      <Menubar className="h-auto w-fit gap-1 border-0 p-0">
        {fundraisingTabs.map(({ id, label }) => {
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
            <p className="text-sm text-muted-foreground">Ładowanie zbiórek...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Nie udało się pobrać listy zbiórek.
            </p>
          )}

          {isEmpty && (
            <p className="text-sm text-muted-foreground">
              {getEmptyMessage(activeTab)}
            </p>
          )}

          {!isLoading && !isError && !isEmpty && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                visibleItemCount > 1 && "lg:grid-cols-2",
              )}
            >
              {activeTab === "oczekujace"
                ? sortedPendingApplications.map((application) =>
                    isApplicationTreasurer(application, treasurerClassIds) ? (
                      <FundraiserApplicationCard
                        key={application.id}
                        application={application}
                        isTreasurer
                      />
                    ) : (
                      <PendingFundraiserApplicationCard
                        key={application.id}
                        application={application}
                      />
                    ),
                  )
                : visibleFundraisers.map((fundraiser) => (
                    <FundraisingCard
                      key={fundraiser.id}
                      fundraiser={fundraiser}
                      isTreasurer={isFundraiserTreasurer(fundraiser, user?.id)}
                      onUpdate={handleFundraiserUpdate}
                    />
                  ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateFundraiserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
