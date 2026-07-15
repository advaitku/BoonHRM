"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  resetEmailTemplate,
  saveEmailTemplate,
} from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TemplateType = "INTERVIEW_INVITE" | "REJECTION" | "APPROVAL";

export function EmailTemplateEditor({
  type,
  label,
  description,
  placeholders,
  subject,
  body,
  isCustomized,
}: {
  type: TemplateType;
  label: string;
  description: string;
  placeholders: string[];
  subject: string;
  body: string;
  isCustomized: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Key the uncontrolled fields to the server values so a reset re-fills them.
  const [formKey, setFormKey] = useState(0);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    startTransition(async () => {
      const result = await saveEmailTemplate(formData);
      if (result.ok) {
        toast.success(`${label} template saved`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onReset() {
    startTransition(async () => {
      const result = await resetEmailTemplate(type);
      if (result.ok) {
        toast.success(`${label} template reset to default`);
        setFormKey((k) => k + 1);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {label}
            {isCustomized && <Badge variant="secondary">Customized</Badge>}
          </CardTitle>
          {isCustomized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={pending}
            >
              <RotateCcw className="size-3.5" />
              Reset to default
            </Button>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey} onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${type}-subject`}>Subject</Label>
            <Input
              id={`${type}-subject`}
              name="subject"
              defaultValue={subject}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${type}-body`}>Body</Label>
            <Textarea
              id={`${type}-body`}
              name="body"
              defaultValue={body}
              rows={10}
              required
              className="font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Placeholders:
              {placeholders.map((p) => (
                <code
                  key={p}
                  className="rounded-none border bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {p}
                </code>
              ))}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save template"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
