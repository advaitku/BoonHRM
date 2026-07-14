"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCandidate } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CandidateProfileValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  workHistory: string;
  education: string;
}

export function CandidateProfileForm({
  candidateId,
  initial,
}: {
  candidateId: string;
  initial: CandidateProfileValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCandidate(candidateId, formData);
      if (result.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input id="fullName" name="fullName" defaultValue={initial.fullName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={2} defaultValue={initial.address} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="workHistory">
            Work history{" "}
            <span className="text-muted-foreground">(last 2 jobs)</span>
          </Label>
          <Textarea
            id="workHistory"
            name="workHistory"
            rows={4}
            placeholder={"Company — Role (2022–2025)\nCompany — Role (2019–2022)"}
            defaultValue={initial.workHistory}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="education">Education</Label>
          <Textarea
            id="education"
            name="education"
            rows={3}
            placeholder="Degree — Institution (year)"
            defaultValue={initial.education}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
