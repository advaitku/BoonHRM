"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Link2, MapPin } from "lucide-react";
import {
  createJobOpening,
  updateJobOpening,
  type ActionResult,
} from "@/lib/actions/job-openings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
};

export function JobOpeningForm({
  openingId,
  initial,
}: {
  openingId?: string;
  initial?: Partial<JobOpeningFormValues>;
}) {
  const router = useRouter();
  const values = { ...DEFAULTS, ...initial };
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(values.status);
  const [autoNotify, setAutoNotify] = useState(values.autoNotify);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(openingId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("autoNotify", String(autoNotify));

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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Responsibilities, requirements, notes for the hiring team…"
              defaultValue={values.description}
              rows={5}
            />
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
