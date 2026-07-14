"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCEPTED =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function ResumePanel({
  candidateId,
  hasResume,
  resumeMime,
  resumeOriginalName,
  extractedText,
}: {
  candidateId: string;
  hasResume: boolean;
  resumeMime: string | null;
  resumeOriginalName: string | null;
  extractedText: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const resumeUrl = `/api/candidates/${candidateId}/resume`;
  const isPdf = resumeMime === "application/pdf";

  async function replaceResume(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(resumeUrl, { method: "PUT", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Replace failed");
        return;
      }
      toast.success("Resume replaced — text re-extracted");
      router.refresh();
    } finally {
      setBusy(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function deleteResume() {
    setBusy(true);
    try {
      const res = await fetch(resumeUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Resume deleted");
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!hasResume) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <FileText className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No resume on file</p>
            <p className="text-sm text-muted-foreground">
              Upload a PDF or DOCX — email and phone are extracted automatically.
            </p>
          </div>
          <Button
            className="mt-1"
            disabled={busy}
            onClick={() => replaceInputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload resume
          </Button>
          <input
            ref={replaceInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => replaceResume(e.target.files?.[0])}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">
            {resumeOriginalName ?? "resume"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={resumeUrl} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              {isPdf ? "Open" : "Download"}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => replaceInputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <input
            ref={replaceInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => replaceResume(e.target.files?.[0])}
          />
        </div>
      </div>

      {isPdf ? (
        <iframe
          src={resumeUrl}
          title="Resume preview"
          className="h-[70vh] w-full rounded-lg border bg-white"
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            DOCX files can&apos;t be previewed in the browser — use Download, or
            read the extracted text below.
          </CardContent>
        </Card>
      )}

      {extractedText && (
        <details className="group rounded-lg border bg-muted/30">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            Extracted text ({extractedText.length.toLocaleString()} characters)
          </summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t px-4 py-3 font-sans text-sm text-muted-foreground">
            {extractedText}
          </pre>
        </details>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this resume?</DialogTitle>
            <DialogDescription>
              The file and its extracted text are removed. The candidate&apos;s
              profile fields stay as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteResume} disabled={busy}>
              {busy ? "Deleting…" : "Delete resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
