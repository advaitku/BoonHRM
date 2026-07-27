"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload, UserPlus, X } from "lucide-react";
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

export function AddCandidateDialog({ jobOpeningId }: { jobOpeningId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Resume tab state
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
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

  async function submitResume(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const nameOverride = new FormData(e.currentTarget).get("fullName");

    setUploading(true);
    try {
      const body = new FormData();
      body.set("jobOpeningId", jobOpeningId);
      body.set("file", file);
      if (nameOverride) body.set("fullName", String(nameOverride));

      const res = await fetch("/api/candidates", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      const picked = [
        data.email && "email",
        data.phone && "phone",
        data.address && "address",
        data.workHistory && "experience",
        data.education && "education",
      ].filter(Boolean);
      toast.success(
        picked.length > 0
          ? `Candidate created — picked up ${picked.join(", ")} from the resume`
          : "Candidate created — review and complete the profile",
      );
      setOpen(false);
      reset();
      router.push(`/candidates/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Upload failed — is the server running?");
    } finally {
      setUploading(false);
    }
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    const ok =
      f.type === "application/pdf" ||
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!ok) {
      toast.error("Only PDF or DOCX resumes are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Resume must be 10 MB or smaller");
      return;
    }
    setFile(f);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
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
            <TabsTrigger value="resume">Upload resume</TabsTrigger>
            <TabsTrigger value="form">Enter manually</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="mt-4">
            <form onSubmit={submitResume} className="space-y-4">
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <FileText className="size-8 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB — name, contact,
                      address, experience & education are picked up when found
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  )}
                >
                  <Upload className="size-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Drop a resume here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF or DOCX, up to 10 MB
                    </p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />

              <div className="space-y-2">
                <Label htmlFor="resume-fullName">
                  Candidate name{" "}
                  <span className="text-muted-foreground">(optional — guessed from the resume)</span>
                </Label>
                <Input id="resume-fullName" name="fullName" placeholder="e.g. Priya Sharma" />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={!file || uploading} className="w-full">
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Extracting…
                    </>
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
