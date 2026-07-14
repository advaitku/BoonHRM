"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { deleteCandidate } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CandidateActions({ candidateId }: { candidateId: string }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteCandidate(candidateId);
      // Redirects on success; only errors reach here.
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
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this candidate?</DialogTitle>
            <DialogDescription>
              Their profile, resume, stage history and email log are permanently
              removed.
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
              {pending ? "Deleting…" : "Delete candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
