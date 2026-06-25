import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EnrollmentAcceptCard } from "@/components/EnrollmentAcceptCard";
import { FundraiserApplicationCard } from "@/components/FundraiserApplicationCard";
import { PendingEnrollmentCard } from "@/components/PendingEnrollmentCard";
import { PendingFundraiserApplicationCard } from "@/components/PendingFundraiserApplicationCard";
import { PendingRefundRequestCard } from "@/components/PendingRefundRequestCard";
import { PendingRemovalCard } from "@/components/PendingRemovalCard";
import { RefundRequestActionCard } from "@/components/RefundRequestActionCard";
import { RemovalAcceptCard } from "@/components/RemovalAcceptCard";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fetchMyPendingRemovals } from "@/features/classes/api/get-my-pending-removals";
import { fetchTreasurerPendingEnrollmentApplications } from "@/features/classes/api/get-treasurer-pending-enrollment-applications";
import { fetchTreasurerPendingRemovals } from "@/features/classes/api/get-treasurer-pending-removals";
import { fetchMyPendingFundraiserApplications } from "@/features/fundraisers/api/get-my-pending-fundraiser-applications";
import { fetchMyPendingRefundRequests } from "@/features/fundraisers/api/get-my-pending-refund-requests";
import { fetchTreasurerPendingFundraiserApplications } from "@/features/fundraisers/api/get-treasurer-pending-fundraiser-applications";
import { fetchTreasurerPendingRefundRequests } from "@/features/fundraisers/api/get-treasurer-pending-refund-requests";
import { fetchMyEnrollmentApplications } from "@/features/users/api/get-my-enrollment-applications";
import { cn } from "@/lib/utils";

function EnrollmentCardsGrid({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4", count > 1 && "lg:grid-cols-2")}
    >
      {children}
    </div>
  );
}

export function ApplicationsPage() {
  const user = useAuthStore((state) => state.user);

  const {
    data: enrollmentApplications = [],
    isLoading: isParentApplicationsLoading,
    isError: isParentApplicationsError,
  } = useQuery({
    queryKey: ["my-enrollment-applications"],
    queryFn: fetchMyEnrollmentApplications,
  });

  const {
    data: treasurerPendingApplications = [],
    isLoading: isTreasurerApplicationsLoading,
    isError: isTreasurerApplicationsError,
  } = useQuery({
    queryKey: ["treasurer-pending-enrollment-applications"],
    queryFn: fetchTreasurerPendingEnrollmentApplications,
  });

  const {
    data: myPendingRemovals = [],
    isLoading: isMyRemovalsLoading,
    isError: isMyRemovalsError,
  } = useQuery({
    queryKey: ["my-pending-removals"],
    queryFn: fetchMyPendingRemovals,
  });

  const {
    data: treasurerPendingRemovals = [],
    isLoading: isTreasurerRemovalsLoading,
    isError: isTreasurerRemovalsError,
  } = useQuery({
    queryKey: ["treasurer-pending-removals"],
    queryFn: fetchTreasurerPendingRemovals,
  });

  const {
    data: myPendingFundraiserApplications = [],
    isLoading: isMyFundraiserApplicationsLoading,
    isError: isMyFundraiserApplicationsError,
  } = useQuery({
    queryKey: ["my-pending-fundraiser-applications", user?.id],
    queryFn: () => fetchMyPendingFundraiserApplications(user!.id),
    enabled: Boolean(user),
  });

  const {
    data: treasurerPendingFundraiserApplications = [],
    isLoading: isTreasurerFundraiserApplicationsLoading,
    isError: isTreasurerFundraiserApplicationsError,
  } = useQuery({
    queryKey: ["treasurer-pending-fundraiser-applications"],
    queryFn: fetchTreasurerPendingFundraiserApplications,
  });

  const {
    data: myPendingRefundRequests = [],
    isLoading: isMyRefundRequestsLoading,
    isError: isMyRefundRequestsError,
  } = useQuery({
    queryKey: ["my-pending-refund-requests"],
    queryFn: fetchMyPendingRefundRequests,
  });

  const {
    data: treasurerPendingRefundRequests = [],
    isLoading: isTreasurerRefundRequestsLoading,
    isError: isTreasurerRefundRequestsError,
  } = useQuery({
    queryKey: ["treasurer-pending-refund-requests"],
    queryFn: fetchTreasurerPendingRefundRequests,
  });

  const pendingParentApplications = enrollmentApplications.filter(
    (application) => application.status === "PENDING",
  );

  const isLoading =
    isParentApplicationsLoading ||
    isTreasurerApplicationsLoading ||
    isMyRemovalsLoading ||
    isTreasurerRemovalsLoading ||
    isMyFundraiserApplicationsLoading ||
    isTreasurerFundraiserApplicationsLoading ||
    isMyRefundRequestsLoading ||
    isTreasurerRefundRequestsLoading;
  const hasParentEnrollmentSection = pendingParentApplications.length > 0;
  const hasTreasurerEnrollmentSection = treasurerPendingApplications.length > 0;
  const hasParentRemovalSection = myPendingRemovals.length > 0;
  const hasTreasurerRemovalSection = treasurerPendingRemovals.length > 0;
  const hasParentFundraiserSection = myPendingFundraiserApplications.length > 0;
  const hasTreasurerFundraiserSection =
    treasurerPendingFundraiserApplications.length > 0;
  const hasParentRefundSection = myPendingRefundRequests.length > 0;
  const hasTreasurerRefundSection = treasurerPendingRefundRequests.length > 0;
  const hasAnySection =
    hasParentEnrollmentSection ||
    hasTreasurerEnrollmentSection ||
    hasParentRemovalSection ||
    hasTreasurerRemovalSection ||
    hasParentFundraiserSection ||
    hasTreasurerFundraiserSection ||
    hasParentRefundSection ||
    hasTreasurerRefundSection;
  const hasAnyError =
    isParentApplicationsError ||
    isTreasurerApplicationsError ||
    isMyRemovalsError ||
    isTreasurerRemovalsError ||
    isMyFundraiserApplicationsError ||
    isTreasurerFundraiserApplicationsError ||
    isMyRefundRequestsError ||
    isTreasurerRefundRequestsError;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Wnioski</h1>
        <p className="text-muted-foreground">
          Oczekujące sprawy do rozpatrzenia
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      )}

      {!isLoading && isParentApplicationsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać Twoich oczekujących zapisów.
        </p>
      )}

      {!isLoading && isTreasurerApplicationsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać wniosków o zapis do rozpatrzenia.
        </p>
      )}

      {!isLoading && isMyRemovalsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać Twoich oczekujących wypisań.
        </p>
      )}

      {!isLoading && isTreasurerRemovalsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać wniosków o wypisanie do rozpatrzenia.
        </p>
      )}

      {!isLoading && isMyFundraiserApplicationsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać Twoich oczekujących wniosków o zbiórki.
        </p>
      )}

      {!isLoading && isTreasurerFundraiserApplicationsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać wniosków o zbiórki do rozpatrzenia.
        </p>
      )}

      {!isLoading && isMyRefundRequestsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać Twoich wniosków o zwrot.
        </p>
      )}

      {!isLoading && isTreasurerRefundRequestsError && (
        <p className="text-sm text-destructive">
          Nie udało się pobrać wniosków o zwrot do rozpatrzenia.
        </p>
      )}

      {!isLoading && !hasAnySection && !hasAnyError && (
        <p className="text-sm text-muted-foreground">
          Brak oczekujących spraw do rozpatrzenia.
        </p>
      )}

      {!isLoading && hasTreasurerEnrollmentSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                Wnioski o zapis do klas
              </h2>
              <p className="text-sm text-muted-foreground">
                Prośby rodziców oczekujące na Twoją decyzję.
              </p>
            </div>

            <EnrollmentCardsGrid count={treasurerPendingApplications.length}>
              {treasurerPendingApplications.map((item) => (
                <EnrollmentAcceptCard
                  key={`${item.classId}-${item.application.id}`}
                  item={item}
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasTreasurerRemovalSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                Wnioski o wypisanie z klas
              </h2>
              <p className="text-sm text-muted-foreground">
                Dzieci oczekujące na rozliczenie i zakończenie wypisania.
              </p>
            </div>

            <EnrollmentCardsGrid count={treasurerPendingRemovals.length}>
              {treasurerPendingRemovals.map((item) => (
                <RemovalAcceptCard
                  key={`${item.classId}-${item.child.id}`}
                  item={item}
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasParentEnrollmentSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Oczekujące zapisy do klas</h2>
              <p className="text-sm text-muted-foreground">
                Prośby wysłane do skarbnika, które czekają na decyzję.
              </p>
            </div>

            <EnrollmentCardsGrid count={pendingParentApplications.length}>
              {pendingParentApplications.map((application) => (
                <PendingEnrollmentCard
                  key={application.id}
                  application={application}
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasParentRemovalSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                Oczekujące wypisania z klas
              </h2>
              <p className="text-sm text-muted-foreground">
                Wypisania zainicjowane przez Ciebie, oczekujące na rozliczenie
                przez skarbnika.
              </p>
            </div>

            <EnrollmentCardsGrid count={myPendingRemovals.length}>
              {myPendingRemovals.map((item) => (
                <PendingRemovalCard
                  key={`${item.classId}-${item.child.id}`}
                  item={item}
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasTreasurerFundraiserSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Wnioski o zbiórki</h2>
              <p className="text-sm text-muted-foreground">
                Propozycje rodziców oczekujące na Twoją decyzję.
              </p>
            </div>

            <EnrollmentCardsGrid
              count={treasurerPendingFundraiserApplications.length}
            >
              {treasurerPendingFundraiserApplications.map((item) => (
                <FundraiserApplicationCard
                  key={item.application.id}
                  application={item.application}
                  isTreasurer
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasTreasurerRefundSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Wnioski o zwrot</h2>
              <p className="text-sm text-muted-foreground">
                Prośby rodziców o zwrot wpłat ze zbiórek oczekujące na Twoją
                decyzję.
              </p>
            </div>

            <EnrollmentCardsGrid count={treasurerPendingRefundRequests.length}>
              {treasurerPendingRefundRequests.map((request) => (
                <RefundRequestActionCard key={request.id} request={request} />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasParentFundraiserSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Oczekujące wnioski o zbiórki</h2>
              <p className="text-sm text-muted-foreground">
                Wnioski wysłane do skarbnika, które czekają na decyzję.
              </p>
            </div>

            <EnrollmentCardsGrid count={myPendingFundraiserApplications.length}>
              {myPendingFundraiserApplications.map((application) => (
                <PendingFundraiserApplicationCard
                  key={application.id}
                  application={application}
                />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasParentRefundSection && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Moje wnioski o zwrot</h2>
              <p className="text-sm text-muted-foreground">
                Prośby o zwrot wpłat ze zbiórek oczekujące na decyzję skarbnika.
              </p>
            </div>

            <EnrollmentCardsGrid count={myPendingRefundRequests.length}>
              {myPendingRefundRequests.map((request) => (
                <PendingRefundRequestCard key={request.id} request={request} />
              ))}
            </EnrollmentCardsGrid>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
