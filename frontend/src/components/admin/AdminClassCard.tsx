import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminClassChildrenDialog } from "@/components/admin/AdminClassChildrenDialog";
import { Button } from "@/components/ui/button";
import { openClassChat } from "@/features/chat/lib/open-chat";
import type { SchoolClassResponseDTO } from "@/features/classes/api/types";

interface AdminClassCardProps {
  schoolClass: SchoolClassResponseDTO;
}

function getStudentsLabel(count: number): string {
  if (count === 1) {
    return "1 uczeń";
  }
  return `${count} uczniów`;
}

export function AdminClassCard({ schoolClass }: AdminClassCardProps) {
  const navigate = useNavigate();
  const [childrenDialogOpen, setChildrenDialogOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const handleOpenChat = async () => {
    setIsOpeningChat(true);
    try {
      const chatId = await openClassChat(schoolClass.id);
      navigate(`/admin/chats/${chatId}`);
    } catch {
      window.alert("Nie udało się otworzyć czatu klasy.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{schoolClass.label}</p>
          <p className="text-sm text-muted-foreground">
            Skarbnik: {schoolClass.treasurer?.fullName ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {getStudentsLabel(schoolClass.children.length)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isOpeningChat}
            onClick={() => void handleOpenChat()}
          >
            {isOpeningChat ? "Otwieranie..." : "Czat"}
          </Button>
          <Button type="button" onClick={() => setChildrenDialogOpen(true)}>
            Uczniowie
          </Button>
        </div>
      </div>

      <AdminClassChildrenDialog
        classId={schoolClass.id}
        classLabel={schoolClass.label}
        open={childrenDialogOpen}
        onOpenChange={setChildrenDialogOpen}
      />
    </div>
  );
}
