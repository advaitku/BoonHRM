"use client";

import Link from "next/link";
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
  UserRound,
  X,
} from "lucide-react";
import {
  createApplication,
  type DuplicateResolution,
} from "@/lib/actions/applications";
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

type FileStatus =
  | "queued"
  | "uploading"
  | "done"
  | "error"
  // Parsed email matches an existing candidate — waiting on Overwrite/Keep.
  | "duplicate"
  // Existing candidate already applied to this opening (one per opening, ever).
  | "already_applied";

type QueuedFile = {
  file: File;
  status: FileStatus;
  error?: string;
  candidateId?: string;
  candidateName?: string;
};

/** Duplicate found by the manual form — the submitted data is held until the
 * user picks a resolution. */
type ManualDuplicate = {
  formData: FormData;
  existingName: string;
};

export function AddCandidateDialog({ jobOpeningId }: { jobOpeningId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Manual tab state
  const [manualDuplicate, setManualDuplicate] = useState<ManualDuplicate | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState<string | null>(null); // candidateId

  // Resume tab state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameOverride, setNameOverride] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setQueue([]);
    setDragOver(false);
    setNameOverride("");
    setManualDuplicate(null);
    setAlreadyApplied(null);
  }

  function submitManual(formData: FormData, resolution?: DuplicateResolution) {
    startTransition(async () => {
      const result = await createApplication(jobOpeningId, formData, resolution);
      if (result.ok) {
        toast.success("Candidate added to Pool");
        setOpen(false);
        reset();
        router.refresh();
        return;
      }
      switch (result.kind) {
        case "duplicate":
          setManualDuplicate({ formData, existingName: result.existingName });
          break;
        case "already_applied":
          setManualDuplicate(null);
          setAlreadyApplied(result.candidateId);
          break;
        default:
          toast.error(result.error);
      }
    });
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlreadyApplied(null);
    submitManual(new FormData(e.currentTarget));
  }

  async function uploadOne(
    entry: QueuedFile,
    override: string,
    resolution?: DuplicateResolution,
  ): Promise<QueuedFile> {
    try {
      const body = new FormData();
      body.set("jobOpeningId", jobOpeningId);
      body.set("file", entry.file);
      if (override) body.set("fullName", override);
      if (resolution) body.set("resolution", resolution);

      const res = await fetch("/api/candidates", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        return { ...entry, status: "error", error: data.error ?? "Upload failed" };
      }
      if (data.status === "duplicate" || data.status === "already_applied") {
        return {
          ...entry,
          status: data.status,
          candidateId: data.candidateId,
          candidateName: data.candidateName,
        };
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

  function finishIfAllDone(results: QueuedFile[]) {
    const done = results.filter((r) => r.status === "done");
    if (done.length === results.length && done.length > 0) {
      setOpen(false);
      reset();
      if (done.length === 1 && done[0].candidateId) {
        router.push(`/candidates/${done[0].candidateId}`);
      }
      router.refresh();
      return true;
    }
    return false;
  }

  async function submitResumes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (queue.length === 0) return;
    // The name override only makes sense for a single resume.
    const override =
      queue.length === 1
        ? String(new FormData(e.currentTarget).get("fullName") ?? "").trim()
        : "";
    setNameOverride(override);

    setUploading(true);
    const results: QueuedFile[] = [...queue];
    try {
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "done") continue;
        results[i] = { ...results[i], status: "uploading" };
        setQueue([...results]);
        results[i] = await uploadOne(results[i], override);
        setQueue([...results]);
      }
    } finally {
      setUploading(false);
    }

    const done = results.filter((r) => r.status === "done");
    const failed = results.filter((r) => r.status === "error");
    const needsAttention = results.filter(
      (r) => r.status === "duplicate" || r.status === "already_applied",
    );

    if (failed.length === 0 && needsAttention.length === 0) {
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
      return;
    }

    if (needsAttention.length > 0) {
      toast.info(
        `${needsAttention.length} resume${needsAttention.length > 1 ? "s" : ""} matched existing candidates — resolve below`,
      );
    }
    if (failed.length > 0) {
      toast.error(
        `Upload failed for ${failed.length} file${failed.length > 1 ? "s" : ""}`,
      );
    }
    // Keep only entries that still need something so a retry doesn't
    // duplicate the successes.
    setQueue(results.filter((r) => r.status !== "done"));
    if (done.length > 0) router.refresh();
  }

  async function resolveDuplicate(index: number, resolution: DuplicateResolution) {
    const results = [...queue];
    results[index] = { ...results[index], status: "uploading" };
    setQueue([...results]);
    setUploading(true);
    try {
      results[index] = await uploadOne(results[index], nameOverride, resolution);
    } finally {
      setUploading(false);
    }
    setQueue([...results]);
    if (results[index].status === "done") {
      toast.success(`Application added for ${results[index].candidateName ?? results[index].file.name}`);
      router.refresh();
      finishIfAllDone(results);
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

  const queuedCount = queue.filter(
    (q) => q.status === "queued" || q.status === "error",
  ).length;

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
                      ) : entry.status === "duplicate" ||
                        entry.status === "already_applied" ? (
                        <UserRound className="size-6 shrink-0 text-amber-600" />
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
                                : entry.status === "duplicate"
                                  ? `Email matches ${entry.candidateName ?? "an existing candidate"}`
                                  : entry.status === "already_applied"
                                    ? `${entry.candidateName ?? "This candidate"} already applied to this opening`
                                    : `${(entry.file.size / 1024).toFixed(0)} KB`}
                        </p>
                        {entry.status === "duplicate" && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={uploading}
                              onClick={() => resolveDuplicate(i, "overwrite")}
                            >
                              Overwrite profile
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={uploading}
                              onClick={() => resolveDuplicate(i, "keep")}
                            >
                              Keep existing data
                            </Button>
                          </div>
                        )}
                        {entry.status === "already_applied" && entry.candidateId && (
                          <Link
                            href={`/candidates/${entry.candidateId}`}
                            className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                          >
                            View candidate →
                          </Link>
                        )}
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

              {queue.length === 1 && queue[0].status === "queued" && (
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
            {manualDuplicate ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {manualDuplicate.existingName} already exists with this
                        email
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Either way, a new application is added for this opening.
                        Overwrite replaces their profile with what you entered;
                        keep leaves it untouched.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:flex-col">
                  <Button
                    disabled={pending}
                    className="w-full"
                    onClick={() =>
                      submitManual(manualDuplicate.formData, "overwrite")
                    }
                  >
                    Overwrite profile &amp; add application
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    className="w-full"
                    onClick={() => submitManual(manualDuplicate.formData, "keep")}
                  >
                    Keep existing data &amp; add application
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    className="w-full"
                    onClick={() => setManualDuplicate(null)}
                  >
                    Back to the form
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form
                onSubmit={submitForm}
                className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"
              >
                {alreadyApplied && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <p>
                      This candidate has already applied to this opening.{" "}
                      <Link
                        href={`/candidates/${alreadyApplied}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View their profile →
                      </Link>
                    </p>
                  </div>
                )}
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
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
