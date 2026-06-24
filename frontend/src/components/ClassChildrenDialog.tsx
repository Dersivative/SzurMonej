import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
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
import { approveEnrollmentApplication } from "@/features/classes/api/approve-enrollment-application";
import { fetchPendingRefundRequestsForClass } from "@/features/classes/api/get-pending-refund-requests-for-class";
import { fetchPendingEnrollmentApplications } from "@/features/classes/api/get-pending-enrollment-applications";
import { fetchSchoolClass } from "@/features/classes/api/get-school-class";
import { rejectEnrollmentApplication } from "@/features/classes/api/reject-enrollment-application";
import { removeClassMembership } from "@/features/classes/api/remove-class-membership";
import { approveRefundRequest } from "@/features/fundraisers/api/approve-refund-request";
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import { fetchMyChildren } from "@/features/users/api/get-my-children";
import { fetchMyEnrollmentApplications } from "@/features/users/api/get-my-enrollment-applications";
import type {
  ChildResponseDTO,
  EnrollmentApplicationResponseDTO,
} from "@/features/users/api/types";

interface ClassChildrenDialogProps {
  classId: number;
  classLabel: string;
  isTreasurer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChildToRemove {
  membershipId: number;
  name: string;
  surname: string;
  action: RemoveChildAction;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pl-PL");
}

export function ClassChildrenDialog({
  classId,
  classLabel,
  isTreasurer,
  open,
  onOpenChange,
}: ClassChildrenDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [childToRemove, setChildToRemove] = useState<ChildToRemove | null>(
    null,
  );

  const { data: schoolClass, isLoading: isClassLoading } = useQuery({
    queryKey: ["school-class", classId],
    queryFn: () => fetchSchoolClass(classId),
    enabled: open,
  });

  const { data: myChildren = [], isLoading: isMyChildrenLoading } = useQuery({
    queryKey: ["my-children"],
    queryFn: fetchMyChildren,
    enabled: open,
  });

  const {
    data: myEnrollmentApplications = [],
    isLoading: isMyApplicationsLoading,
  } = useQuery({
    queryKey: ["my-enrollment-applications"],
    queryFn: fetchMyEnrollmentApplications,
    enabled: open,
  });

  const { data: pendingApplications = [], isLoading: isApplicationsLoading } =
    useQuery({
      queryKey: ["enrollment-applications", classId, "PENDING"],
      queryFn: () => fetchPendingEnrollmentApplications(classId),
      enabled: open && isTreasurer,
    });

  const {
    data: pendingRefundRequests = [],
    isLoading: isRefundRequestsLoading,
  } = useQuery({
    queryKey: ["class-refund-requests", classId],
    queryFn: () => fetchPendingRefundRequestsForClass(classId),
    enabled: open && isTreasurer,
  });

  const invalidateClassData = () => {
    queryClient.invalidateQueries({ queryKey: ["school-class", classId] });
    queryClient.invalidateQueries({
      queryKey: ["enrollment-applications", classId],
    });
    queryClient.invalidateQueries({ queryKey: ["class-refund-requests", classId] });
    queryClient.invalidateQueries({ queryKey: ["my-accessible-classes"] });
    queryClient.invalidateQueries({ queryKey: ["all-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["my-school-classes"] });
    queryClient.invalidateQueries({ queryKey: ["my-children"] });
    queryClient.invalidateQueries({ queryKey: ["my-enrollment-applications"] });
    queryClient.invalidateQueries({ queryKey: ["my-pending-removals"] });
    queryClient.invalidateQueries({ queryKey: ["treasurer-pending-removals"] });
    queryClient.invalidateQueries({ queryKey: ["my-fundraisers"] });
  };

  const { mutate: approveApplication, isPending: isApproving } = useMutation({
    mutationFn: (applicationId: number) =>
      approveEnrollmentApplication(classId, applicationId),
    onSuccess: () => {
      setError(null);
      invalidateClassData();
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się dołączyć dziecka."));
    },
  });

  const { mutate: rejectApplication, isPending: isRejecting } = useMutation({
    mutationFn: (applicationId: number) =>
      rejectEnrollmentApplication(classId, applicationId),
    onSuccess: () => {
      setError(null);
      invalidateClassData();
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nie udało się odrzucić wniosku."));
    },
  });

  const { mutate: removeChild, isPending: isRemoving } = useMutation({
    mutationFn: (membershipId: number) => removeClassMembership(membershipId),
    onSuccess: () => {
      setError(null);
      setChildToRemove(null);
      invalidateClassData();
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          childToRemove?.action === "withdraw"
            ? "Nie udało się wypisać dziecka z klasy."
            : childToRemove?.action === "finalize"
              ? "Nie udało się zakończyć wypisywania dziecka."
              : "Nie udało się usunąć dziecka z klasy.",
        ),
      );
    },
  });

  const { mutate: approveRefund, isPending: isApprovingRefund } = useMutation({
    mutationFn: (requestId: number) => approveRefundRequest(requestId),
    onSuccess: () => {
      setError(null);
      invalidateClassData();
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Nie udało się zatwierdzić zwrotu."),
      );
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setChildToRemove(null);
    }
    onOpenChange(nextOpen);
  };

  const children = schoolClass?.children ?? [];

  const myChildIds = useMemo(
    () =>
      new Set(
        myChildren
          .filter((child) => child.schoolClassId === classId)
          .map((child) => child.id),
      ),
    [myChildren, classId],
  );

  const myChildrenInClass = children.filter((child) =>
    myChildIds.has(child.id),
  );
  const otherChildren = children.filter((child) => !myChildIds.has(child.id));

  const myPendingEnrollmentsForClass = useMemo(
    () =>
      myEnrollmentApplications.filter(
        (application) =>
          application.status === "PENDING" &&
          application.classLabel === classLabel,
      ),
    [myEnrollmentApplications, classLabel],
  );

  const pendingEnrollmentsNotYetListed = pendingApplications.filter(
    (application) =>
      !children.some((child) => child.id === application.child.id),
  );

  const showMyChildrenSection =
    myChildrenInClass.length > 0 ||
    (!isTreasurer && myPendingEnrollmentsForClass.length > 0);

  const studentsCount =
    children.length + pendingEnrollmentsNotYetListed.length;

  const isLoading =
    isClassLoading ||
    isMyChildrenLoading ||
    isMyApplicationsLoading ||
    (isTreasurer && (isApplicationsLoading || isRefundRequestsLoading));
  const isActionPending =
    isApproving || isRejecting || isRemoving || isApprovingRefund;

  const getRefundsForChild = (child: ChildResponseDTO) =>
    pendingRefundRequests.filter(
      (request) =>
        request.participant.child.name === child.name &&
        request.participant.child.surname === child.surname,
    );

  const openRemoveDialog = (
    child: ChildResponseDTO,
    action: RemoveChildAction,
  ) => {
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
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader className="w-full sm:place-items-stretch">
            <AlertDialogTitle>Dzieci — {classLabel}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="w-full min-w-0 space-y-4 pt-2 text-left text-foreground">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">Ładowanie...</p>
                )}

                {!isLoading && studentsCount === 0 && !showMyChildrenSection && (
                  <p className="text-sm text-muted-foreground">
                    Brak dzieci przypisanych do tej klasy.
                  </p>
                )}

                {!isLoading && (showMyChildrenSection || studentsCount > 0) && (
                  <ul className="w-full space-y-2">
                    {isTreasurer &&
                      pendingEnrollmentsNotYetListed.map((application) => (
                        <li
                          key={`pending-student-${application.id}`}
                          className="flex w-full flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-medium">
                              {application.child.name}{" "}
                              {application.child.surname}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Rodzic: {application.parent.fullName}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              Oczekuje na zatwierdzenie
                            </Badge>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isActionPending}
                              onClick={() =>
                                approveApplication(application.id)
                              }
                            >
                              Akceptuj
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isActionPending}
                              onClick={() =>
                                rejectApplication(application.id)
                              }
                            >
                              Odrzuć
                            </Button>
                          </div>
                        </li>
                      ))}
                    {!isTreasurer &&
                      myPendingEnrollmentsForClass.map((application) => (
                        <PendingEnrollmentRow
                          key={`pending-${application.id}`}
                          application={application}
                        />
                      ))}
                    {myChildrenInClass.map((child) => (
                      <ChildRow
                        key={child.id}
                        child={child}
                        isTreasurer={isTreasurer}
                        pendingRefunds={getRefundsForChild(child)}
                        actionLabel="Wypisz"
                        finalizeLabel="Zakończ wypisanie"
                        showAction
                        isActionPending={isActionPending}
                        onAction={() => openRemoveDialog(child, "withdraw")}
                        onFinalize={() => openRemoveDialog(child, "finalize")}
                        onApproveRefund={(requestId) => approveRefund(requestId)}
                      />
                    ))}
                    {otherChildren.map((child) => (
                      <ChildRow
                        key={child.id}
                        child={child}
                        isTreasurer={isTreasurer}
                        pendingRefunds={getRefundsForChild(child)}
                        actionLabel="Usuń"
                        finalizeLabel="Zakończ wypisanie"
                        showAction={isTreasurer}
                        isActionPending={isActionPending}
                        onAction={() => openRemoveDialog(child, "remove")}
                        onFinalize={() => openRemoveDialog(child, "finalize")}
                        onApproveRefund={(requestId) => approveRefund(requestId)}
                      />
                    ))}
                  </ul>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {childToRemove && (
        <RemoveChildFromClassDialog
          open={childToRemove != null}
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

interface ChildRowProps {
  child: ChildResponseDTO;
  showAction: boolean;
  isTreasurer: boolean;
  pendingRefunds: RefundRequestResponseDTO[];
  actionLabel: string;
  finalizeLabel: string;
  isActionPending: boolean;
  onAction: () => void;
  onFinalize: () => void;
  onApproveRefund: (requestId: number) => void;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

function ChildRow({
  child,
  showAction,
  isTreasurer,
  pendingRefunds,
  actionLabel,
  finalizeLabel,
  isActionPending,
  onAction,
  onFinalize,
  onApproveRefund,
}: ChildRowProps) {
  const isPendingRemoval = child.status === "REMOVAL_PENDING";
  const hasPendingRefunds = pendingRefunds.length > 0;

  return (
    <li
      className={`flex w-full flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
        isPendingRemoval ? "bg-amber-50/50" : ""
      }`}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">
          {child.name} {child.surname}
        </p>
        {child.dateOfBirth && (
          <p className="text-xs text-muted-foreground">
            ur. {formatDate(child.dateOfBirth)}
          </p>
        )}
        {isPendingRemoval && (
          <div className="space-y-1">
            <Badge variant="secondary" className="text-xs">
              W trakcie wypisywania
            </Badge>
            {!isTreasurer && (
              <p className="text-xs text-muted-foreground">
                Oczekuje na rozliczenie przez skarbnika.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        {isTreasurer && isPendingRemoval && hasPendingRefunds && (
          <div className="space-y-2">
            {pendingRefunds.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-1 rounded-md border bg-background p-2 sm:items-end"
              >
                <p className="text-xs text-muted-foreground">
                  Zwrot {formatMoney(request.amount)} dla{" "}
                  {request.requester.fullName}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => onApproveRefund(request.id)}
                >
                  Zatwierdź zwrot
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAction && !isPendingRemoval && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isActionPending || child.membershipId == null}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}

        {isTreasurer && isPendingRemoval && !hasPendingRefunds && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isActionPending || child.membershipId == null}
            onClick={onFinalize}
          >
            {finalizeLabel}
          </Button>
        )}
      </div>
    </li>
  );
}

function PendingEnrollmentRow({
  application,
}: {
  application: EnrollmentApplicationResponseDTO;
}) {
  return (
    <li className="flex w-full flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          {application.child.name} {application.child.surname}
        </p>
        <Badge variant="secondary" className="text-xs">
          Oczekuje na zatwierdzenie
        </Badge>
        <p className="text-xs text-muted-foreground">
          Złożono: {formatDate(application.requestedAt)}
        </p>
      </div>
    </li>
  );
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
