"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
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

export interface ResumeSummary {
  id: string;
  mime: string;
  originalName: string;
  extractedText: string | null;
  createdAt: string;
}

export function ResumePanel({
  candidateId,
  resumes,
}: {
  candidateId: string;
  resumes: ResumeSummary[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResumeSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function addResumes(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch(`/api/candidates/${candidateId}/resumes`, {
          method: "POST",
          body,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `Failed to add ${file.name}`);
          continue;
        }
      }
      toast.success(files.length > 1 ? "Resumes added" : "Resume added");
      router.refresh();
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteResume(resume: ResumeSummary) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/candidates/${candidateId}/resumes/${resume.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Resume deleted");
      setPendingDelete(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {resumes.length > 0
            ? `${resumes.length} resume${resumes.length === 1 ? "" : "s"}`
            : "No resumes on file"}
        </p>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Add resume
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => addResumes(e.target.files)}
        />
      </div>

      {resumes.length === 0 ? (
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => {
            const resumeUrl = `/api/candidates/${candidateId}/resumes/${resume.id}`;
            const isPdf = resume.mime === "application/pdf";
            return (
              <div key={resume.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {resume.originalName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Added {dateFmt.format(new Date(resume.createdAt))}
                      </span>
                    </div>
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
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => setPendingDelete(resume)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {isPdf ? (
                  <iframe
                    src={resumeUrl}
                    title={`${resume.originalName} preview`}
                    className="h-[50vh] w-full rounded-lg border bg-white"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    DOCX files can&apos;t be previewed in the browser — use
                    Download, or read the extracted text below.
                  </p>
                )}

                {resume.extractedText && (
                  <details className="group rounded-lg border bg-muted/30">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                      Extracted text (
                      {resume.extractedText.length.toLocaleString()} characters)
                    </summary>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t px-4 py-3 font-sans text-sm text-muted-foreground">
                      {resume.extractedText}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this resume?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.originalName} and its extracted text are removed.
              The candidate&apos;s profile fields stay as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && deleteResume(pendingDelete)}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
