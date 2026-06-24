import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CreateFundraiserDialog } from "@/components/CreateFundraiserDialog";
import { FundraiserApplicationCard } from "@/components/FundraiserApplicationCard";
import { FundraisingCard } from "@/components/FundraisingCard";
import { PendingFundraiserApplicationCard } from "@/components/PendingFundraiserApplicationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchClassesForFundraiserCreation } from "@/features/fundraisers/api/get-classes-for-fundraiser-creation";
import { fetchMyFundraisers } from "@/features/fundraisers/api/get-my-fundraisers";
import type {
  FundraiserApplicationListItemDTO,
  FundraiserResponseDTO,
  MyFundraisersResult,
} from "@/features/fundraisers/api/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { cn } from "@/lib/utils";

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

type FundraisingListItem =
  | {
      kind: "application";
      id: string;
      application: FundraiserApplicationListItemDTO;
      sortDate: string;
    }
  | {
      kind: "fundraiser";
      id: string;
      fundraiser: FundraiserResponseDTO;
      sortDate: string;
    };

export function FundraisingPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
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

  const sortedItems = useMemo(() => {
    const items: FundraisingListItem[] = [
      ...pendingApplications.map((application) => ({
        kind: "application" as const,
        id: `application-${application.id}`,
        application,
        sortDate: application.requestedAt ?? "",
      })),
      ...fundraisers.map((fundraiser) => ({
        kind: "fundraiser" as const,
        id: `fundraiser-${fundraiser.id}`,
        fundraiser,
        sortDate: fundraiser.startedAt,
      })),
    ];

    return items.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "application" ? -1 : 1;
      }

      return right.sortDate.localeCompare(left.sortDate);
    });
  }, [fundraisers, pendingApplications]);

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

  const isEmpty = !isLoading && !isError && sortedItems.length === 0;

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
              Nie masz jeszcze żadnych zbiórek.
            </p>
          )}

          {!isLoading && !isError && sortedItems.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                sortedItems.length > 1 && "lg:grid-cols-2",
              )}
            >
              {sortedItems.map((item) =>
                item.kind === "application" ? (
                  isApplicationTreasurer(
                    item.application,
                    treasurerClassIds,
                  ) ? (
                    <FundraiserApplicationCard
                      key={item.id}
                      application={item.application}
                      isTreasurer
                    />
                  ) : (
                    <PendingFundraiserApplicationCard
                      key={item.id}
                      application={item.application}
                    />
                  )
                ) : (
                  <FundraisingCard
                    key={item.id}
                    fundraiser={item.fundraiser}
                    isTreasurer={isFundraiserTreasurer(item.fundraiser, user?.id)}
                    onUpdate={handleFundraiserUpdate}
                  />
                ),
              )}
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
