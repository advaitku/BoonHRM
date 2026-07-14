"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  deleteJobOpening,
  setJobOpeningStatus,
} from "@/lib/actions/job-openings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function OpeningActions({
  openingId,
  status,
}: {
  openingId: string;
  status: "OPEN" | "CLOSED";
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleStatus() {
    startTransition(async () => {
      const next = status === "OPEN" ? "CLOSED" : "OPEN";
      const result = await setJobOpeningStatus(openingId, next);
      if (result.ok) {
        toast.success(next === "CLOSED" ? "Opening closed" : "Opening reopened");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteJobOpening(openingId);
      // On success the action redirects; only errors reach here.
      if (result && !result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={pending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/job-openings/${openingId}/edit`}>
              <Pencil className="size-4" />
              Edit opening
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleStatus}>
            {status === "OPEN" ? (
              <>
                <Archive className="size-4" />
                Close opening
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Reopen opening
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete opening
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this opening?</DialogTitle>
            <DialogDescription>
              This permanently removes the opening. Openings with candidates
              can&apos;t be deleted — close them instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
