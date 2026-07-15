"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveOfferAgreement, resetOfferAgreement } from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OfferAgreementForm({
  agreement,
  isCustomized,
}: {
  agreement: string;
  isCustomized: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Bumped on reset so the uncontrolled textarea re-fills with the default.
  const [formKey, setFormKey] = useState(0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveOfferAgreement(formData);
      if (result.ok) {
        toast.success("Agreement saved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onReset() {
    startTransition(async () => {
      const result = await resetOfferAgreement();
      if (result.ok) {
        toast.success("Agreement reset to default");
        setFormKey((k) => k + 1);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="offer-agreement">Agreement text</Label>
          {isCustomized && <Badge variant="secondary">Customized</Badge>}
        </div>
        <Textarea
          id="offer-agreement"
          name="agreement"
          rows={18}
          defaultValue={agreement}
          required
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Plain text — line breaks are preserved on the offer page.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save agreement"}
        </Button>
        {isCustomized && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onReset}
          >
            Reset to default
          </Button>
        )}
      </div>
    </form>
  );
}
