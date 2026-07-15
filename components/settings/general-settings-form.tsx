"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveGeneralSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GeneralSettingsForm({
  companyName,
  autoRejectDays,
  notificationEmail,
}: {
  companyName: string;
  autoRejectDays: number;
  notificationEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveGeneralSettings(formData);
      if (result.ok) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          name="companyName"
          defaultValue={companyName}
          required
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          Appears in every candidate email (header, signature and footer).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="autoRejectDays">Auto-reject after (days)</Label>
        <Input
          id="autoRejectDays"
          name="autoRejectDays"
          type="number"
          min={1}
          max={3650}
          defaultValue={autoRejectDays}
          required
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Candidates still in Pool, Interview or Shortlist this many days after
          being added are rejected automatically by the daily sweep.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notificationEmail">Notification email</Label>
        <Input
          id="notificationEmail"
          name="notificationEmail"
          type="email"
          defaultValue={notificationEmail}
          required
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Internal inbox that receives offer accept/decline notifications.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
