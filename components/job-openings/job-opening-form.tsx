"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Globe, Link2, MapPin } from "lucide-react";
import {
  createJobOpening,
  updateJobOpening,
  type ActionResult,
} from "@/lib/actions/job-openings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { CopyLink } from "@/components/candidates/copy-link";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface JobOpeningFormValues {
  title: string;
  description: string;
  location: string;
  positions: number;
  status: "OPEN" | "CLOSED";
  onlineInterviewUrl: string;
  inPersonInterviewUrl: string;
  autoNotify: boolean;
  closureDeadline: string; // yyyy-mm-dd
  interviewDeadline: string; // yyyy-mm-dd
  published: boolean;
}

const DEFAULTS: JobOpeningFormValues = {
  title: "",
  description: "",
  location: "",
  positions: 1,
  status: "OPEN",
  onlineInterviewUrl: "",
  inPersonInterviewUrl: "",
  autoNotify: true,
  closureDeadline: "",
  interviewDeadline: "",
  // Off by default — confidential roles must never become public by accident.
  published: false,
};

export function JobOpeningForm({
  openingId,
  initial,
  publicUrl,
}: {
  openingId?: string;
  initial?: Partial<JobOpeningFormValues>;
  /** Absolute public URL — resolved server-side (see lib/job-ref.ts). */
  publicUrl?: string;
}) {
  const router = useRouter();
  const values = { ...DEFAULTS, ...initial };
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(values.status);
  const [autoNotify, setAutoNotify] = useState(values.autoNotify);
  const [published, setPublished] = useState(values.published);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(openingId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // DatePicker and RichTextEditor render hidden inputs, so FormData already
    // has them — only these Switch/Select values need setting explicitly.
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("autoNotify", String(autoNotify));
    formData.set("published", String(published));

    startTransition(async () => {
      const result: ActionResult = editing
        ? await updateJobOpening(openingId!, formData)
        : await createJobOpening(formData);
      if (result.ok) {
        toast.success(editing ? "Opening updated" : "Opening created");
        router.push(`/job-openings/${result.id}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground" />
            Role details
          </CardTitle>
          <CardDescription>
            What the opening is and how many people you&apos;re hiring.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">
              Job title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Senior Accountant"
              defaultValue={values.title}
              required
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" />
              Location
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="e.g. Mumbai (on-site)"
              defaultValue={values.location}
              maxLength={160}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="positions">Positions</Label>
              <Input
                id="positions"
                name="positions"
                type="number"
                min={1}
                max={999}
                defaultValue={values.positions}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "OPEN" | "CLOSED")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closureDeadline">Position closure deadline</Label>
            <DatePicker
              id="closureDeadline"
              name="closureDeadline"
              defaultValue={values.closureDeadline}
              placeholder="No deadline"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the opening card, flagged red once it passes.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              id="description"
              name="description"
              defaultValue={values.description}
              placeholder="Responsibilities, requirements, what a great candidate looks like…"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the public job page when this opening is published.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            Interview scheduling & notifications
          </CardTitle>
          <CardDescription>
            These URLs are offered as choices when you move a candidate to
            Interview — the invite email includes the one you pick.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="onlineInterviewUrl">Online interview URL</Label>
            <Input
              id="onlineInterviewUrl"
              name="onlineInterviewUrl"
              type="url"
              placeholder="https://meet.google.com/…"
              defaultValue={values.onlineInterviewUrl}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inPersonInterviewUrl">In-person interview URL</Label>
            <Input
              id="inPersonInterviewUrl"
              name="inPersonInterviewUrl"
              type="url"
              placeholder="https://maps.google.com/… or a booking link"
              defaultValue={values.inPersonInterviewUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interviewDeadline">Complete interview by</Label>
            <DatePicker
              id="interviewDeadline"
              name="interviewDeadline"
              defaultValue={values.interviewDeadline}
              placeholder="No deadline"
            />
            <p className="text-xs text-muted-foreground">
              Included in the interview invite email, if set.
            </p>
          </div>

          <Separator className="sm:col-span-2" />

          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="autoNotify">Auto-notify candidates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically email candidates on rejection (including the 75-day
                auto-reject sweep). Interview and approval emails always confirm
                with you first.
              </p>
            </div>
            <Switch
              id="autoNotify"
              checked={autoNotify}
              onCheckedChange={setAutoNotify}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            Public listing
          </CardTitle>
          <CardDescription>
            Publish this role to a shareable public page you can link from
            LinkedIn, WhatsApp or email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="published">Publish to the public job page</Label>
              <p className="text-sm text-muted-foreground">
                When on, anyone with the link can view this role. Leave off for
                confidential openings.
              </p>
            </div>
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>

          {published &&
            (publicUrl ? (
              <CopyLink url={publicUrl} />
            ) : (
              <p className="text-xs text-muted-foreground">
                The public link appears here once the opening is created.
              </p>
            ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create opening"}
        </Button>
      </div>
    </form>
  );
}
