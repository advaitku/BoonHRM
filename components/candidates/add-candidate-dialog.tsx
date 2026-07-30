"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { createCandidate } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ACCEPTED =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_FILES = 10;

type FileStatus = "queued" | "uploading" | "done" | "error";

type QueuedFile = {
  file: File;
  status: FileStatus;
  error?: string;
  candidateId?: string;
};

export function AddCandidateDialog({ jobOpeningId }: { jobOpeningId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Resume tab state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setQueue([]);
    setDragOver(false);
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCandidate(jobOpeningId, formData);
      if (result.ok) {
        toast.success("Candidate added to Pool");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function uploadOne(
    entry: QueuedFile,
    nameOverride: string,
  ): Promise<QueuedFile> {
    try {
      const body = new FormData();
      body.set("jobOpeningId", jobOpeningId);
      body.set("file", entry.file);
      if (nameOverride) body.set("fullName", nameOverride);

      const res = await fetch("/api/candidates", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        return { ...entry, status: "error", error: data.error ?? "Upload failed" };
      }
      return { ...entry, status: "done", candidateId: data.id };
    } catch {
      return {
        ...entry,
        status: "error",
        error: "Upload failed — is the server running?",
      };
    }
  }

  async function submitResumes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (queue.length === 0) return;
    // The name override only makes sense for a single resume.
    const nameOverride =
      queue.length === 1
        ? String(new FormData(e.currentTarget).get("fullName") ?? "").trim()
        : "";

    setUploading(true);
    const results: QueuedFile[] = [...queue];
    try {
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "done") continue;
        results[i] = { ...results[i], status: "uploading" };
        setQueue([...results]);
        results[i] = await uploadOne(results[i], nameOverride);
        setQueue([...results]);
      }
    } finally {
      setUploading(false);
    }

    const done = results.filter((r) => r.status === "done");
    const failed = results.filter((r) => r.status === "error");

    if (failed.length === 0) {
      toast.success(
        done.length === 1
          ? "Candidate created from resume"
          : `${done.length} candidates created from resumes`,
      );
      setOpen(false);
      reset();
      if (done.length === 1 && done[0].candidateId) {
        router.push(`/candidates/${done[0].candidateId}`);
      }
      router.refresh();
    } else {
      toast.error(
        done.length > 0
          ? `${done.length} created, ${failed.length} failed — failed files stay in the list`
          : `Upload failed for ${failed.length} file${failed.length > 1 ? "s" : ""}`,
      );
      // Keep only the failures so a retry doesn't duplicate the successes.
      setQueue(results.filter((r) => r.status !== "done"));
      if (done.length > 0) router.refresh();
    }
  }

  function pickFiles(list: FileList | File[] | null | undefined) {
    if (!list) return;
    const incoming = Array.from(list);
    const next = [...queue];
    for (const f of incoming) {
      const ok =
        f.type === "application/pdf" ||
        f.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!ok) {
        toast.error(`${f.name}: only PDF or DOCX resumes are supported`);
        continue;
      }
      if (f.size > 3 * 1024 * 1024) {
        toast.error(`${f.name}: resume must be 3 MB or smaller`);
        continue;
      }
      if (next.some((q) => q.file.name === f.name && q.file.size === f.size)) {
        continue; // already queued
      }
      if (next.length >= MAX_FILES) {
        toast.error(`Up to ${MAX_FILES} resumes at a time`);
        break;
      }
      next.push({ file: f, status: "queued" });
    }
    setQueue(next);
  }

  function removeAt(index: number) {
    setQueue((q) => q.filter((_, i) => i !== index));
  }

  const queuedCount = queue.filter((q) => q.status !== "done").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (uploading) return; // don't close mid-upload
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add candidate</DialogTitle>
          <DialogDescription>
            New candidates start in the Pool column.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resume">Upload resumes</TabsTrigger>
            <TabsTrigger value="form">Enter manually</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="mt-4">
            <form onSubmit={submitResumes} className="space-y-4">
              {queue.length > 0 && (
                <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {queue.map((entry, i) => (
                    <li
                      key={`${entry.file.name}-${entry.file.size}`}
                      className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3"
                    >
                      {entry.status === "uploading" ? (
                        <Loader2 className="size-6 shrink-0 animate-spin text-muted-foreground" />
                      ) : entry.status === "done" ? (
                        <CheckCircle2 className="size-6 shrink-0 text-green-600" />
                      ) : entry.status === "error" ? (
                        <AlertCircle className="size-6 shrink-0 text-destructive" />
                      ) : (
                        <FileText className="size-6 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {entry.file.name}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            entry.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {entry.status === "error"
                            ? entry.error
                            : entry.status === "uploading"
                              ? "Extracting…"
                              : entry.status === "done"
                                ? "Candidate created"
                                : `${(entry.file.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      {!uploading && entry.status !== "done" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAt(i)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {queue.length < MAX_FILES && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFiles(e.dataTransfer.files);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors",
                    queue.length > 0 ? "p-4" : "p-8",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  )}
                >
                  <Upload
                    className={cn(
                      "text-muted-foreground",
                      queue.length > 0 ? "size-5" : "size-8",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {queue.length > 0
                        ? "Add more resumes"
                        : "Drop resumes here or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF or DOCX, up to 3 MB each — max {MAX_FILES} at a time
                    </p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={(e) => {
                  pickFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {queue.length === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="resume-fullName">
                    Candidate name{" "}
                    <span className="text-muted-foreground">
                      (optional — guessed from the resume)
                    </span>
                  </Label>
                  <Input
                    id="resume-fullName"
                    name="fullName"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={queuedCount === 0 || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading {queue.filter((q) => q.status === "done").length}/
                      {queue.length}…
                    </>
                  ) : queuedCount > 1 ? (
                    `Create ${queuedCount} candidates from resumes`
                  ) : (
                    "Create from resume"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="form" className="mt-4">
            <form
              onSubmit={submitForm}
              className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input id="fullName" name="fullName" required autoComplete="off" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" autoComplete="off" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workHistory">Work history</Label>
                <Textarea
                  id="workHistory"
                  name="workHistory"
                  rows={3}
                  placeholder="Last 2 jobs — company, role, dates"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Textarea id="education" name="education" rows={2} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? "Adding…" : "Add candidate"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
