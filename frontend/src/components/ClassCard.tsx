import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClassChildrenDialog } from "@/components/ClassChildrenDialog";
import { ClassEnrollmentLinkDialog } from "@/components/ClassEnrollmentLinkDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openClassChat } from "@/features/chat/lib/open-chat";
import type { SchoolClassResponseDTO } from "@/features/classes/api/types";

interface ClassCardProps {
  schoolClass?: SchoolClassResponseDTO;
  pendingLabel?: string;
  isTreasurer?: boolean;
}

function getStudentsLabel(count: number): string {
  if (count === 1) {
    return "1 uczeń";
  }

  if (count >= 2 && count <= 4) {
    return `${count} uczniów`;
  }

  return `${count} uczniów`;
}

export function ClassCard({
  schoolClass,
  pendingLabel,
  isTreasurer = false,
}: ClassCardProps) {
  const navigate = useNavigate();
  const [childrenDialogOpen, setChildrenDialogOpen] = useState(false);
  const [enrollmentLinkDialogOpen, setEnrollmentLinkDialogOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const label = pendingLabel ?? schoolClass?.label ?? "";
  const isPending = Boolean(pendingLabel);
  const studentsCount = schoolClass?.children.length ?? 0;
  const treasurerName = schoolClass?.treasurer?.fullName;

  const handleOpenChat = async () => {
    if (!schoolClass) {
      return;
    }

    setIsOpeningChat(true);
    try {
      const chatId = await openClassChat(schoolClass.id);
      navigate(`/app/chats/${chatId}`);
    } catch {
      window.alert("Nie udało się otworzyć czatu klasy.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <div className="h-full">
      <div className="flex h-full items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-base font-semibold">Klasa: {label}</p>
          {!isPending && treasurerName && (
            <p className="text-sm text-muted-foreground">
              Skarbnik: {treasurerName}
            </p>
          )}
          {!isPending && (
            <p className="text-sm text-muted-foreground">
              {getStudentsLabel(studentsCount)}
            </p>
          )}
          {isPending && (
            <p className="text-sm text-muted-foreground">
              Wniosek oczekuje na decyzję administratora.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!isPending && schoolClass && isTreasurer && (
            <Button
              type="button"
              size="lg"
              className="h-11 px-5 text-base"
              onClick={() => setEnrollmentLinkDialogOpen(true)}
            >
              Link do zapisów
            </Button>
          )}
          {!isPending && schoolClass && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-11 px-5 text-base"
              disabled={isOpeningChat}
              onClick={() => void handleOpenChat()}
            >
              {isOpeningChat ? "Otwieranie..." : "Czat"}
            </Button>
          )}
          {!isPending && schoolClass && (
            <Button
              type="button"
              size="lg"
              className="h-11 px-5 text-base"
              onClick={() => setChildrenDialogOpen(true)}
            >
              Dzieci
            </Button>
          )}
          {isPending && (
            <Badge variant="secondary">Oczekująca na zatwierdzenie</Badge>
          )}
        </div>
      </div>

      {schoolClass && isTreasurer && (
        <ClassEnrollmentLinkDialog
          classId={schoolClass.id}
          classLabel={schoolClass.label}
          open={enrollmentLinkDialogOpen}
          onOpenChange={setEnrollmentLinkDialogOpen}
        />
      )}

      {schoolClass && (
        <ClassChildrenDialog
          classId={schoolClass.id}
          classLabel={schoolClass.label}
          isTreasurer={isTreasurer}
          open={childrenDialogOpen}
          onOpenChange={setChildrenDialogOpen}
        />
      )}
    </div>
  );
}
