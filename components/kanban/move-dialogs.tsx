"use client";

import { useEffect, useState } from "react";
import { Building2, Check, MailX, Video } from "lucide-react";
import type { BoardCandidate, BoardOpening } from "@/components/kanban/board-types";
import type { MoveInput } from "@/lib/actions/stage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Extras = Partial<
  Pick<
    MoveInput,
    "rejectionType" | "rejectionReason" | "interviewUrlKind" | "ctcDetails" | "sendEmail"
  >
>;

interface GateDialogProps {
  candidate: BoardCandidate | null;
  opening: BoardOpening;
  onConfirm: (extras: Extras) => void;
  onCancel: () => void;
}

/** Interview move — pick which interview URL goes into the invite email. */
export function InterviewUrlDialog({
  candidate,
  opening,
  onConfirm,
  onCancel,
}: GateDialogProps) {
  const hasOnline = Boolean(opening.onlineInterviewUrl);
  const hasInPerson = Boolean(opening.inPersonInterviewUrl);
  const [kind, setKind] = useState<"online" | "inPerson" | "none">("none");

  useEffect(() => {
    if (candidate) setKind(hasOnline ? "online" : hasInPerson ? "inPerson" : "none");
  }, [candidate, hasOnline, hasInPerson]);

  const noEmailPossible = !candidate?.email;

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {candidate?.fullName} to Interview</DialogTitle>
          <DialogDescription>
            {noEmailPossible
              ? "This candidate has no email address on file, so no invite can be sent."
              : "Choose which link to include in the interview invite email."}
          </DialogDescription>
        </DialogHeader>

        {!noEmailPossible && (
          <div className="space-y-2">
            <OptionRow
              icon={Video}
              title="Online interview"
              subtitle={opening.onlineInterviewUrl ?? "No online URL configured"}
              disabled={!hasOnline}
              selected={kind === "online"}
              onSelect={() => setKind("online")}
            />
            <OptionRow
              icon={Building2}
              title="In-person interview"
              subtitle={opening.inPersonInterviewUrl ?? "No in-person URL configured"}
              disabled={!hasInPerson}
              selected={kind === "inPerson"}
              onSelect={() => setKind("inPerson")}
            />
            <OptionRow
              icon={MailX}
              title="Move without sending an email"
              subtitle="No invite goes out — you contact the candidate yourself"
              selected={kind === "none"}
              onSelect={() => setKind("none")}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                interviewUrlKind: noEmailPossible ? "none" : kind,
                sendEmail: !noEmailPossible && kind !== "none",
              })
            }
          >
            {noEmailPossible || kind === "none"
              ? "Move to Interview"
              : "Move & send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  icon: Icon,
  title,
  subtitle,
  selected,
  disabled,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

/** Rejection move — who rejected + optional reason, gates the move. */
export function RejectDialog({
  candidate,
  opening,
  onConfirm,
  onCancel,
}: GateDialogProps) {
  const [type, setType] = useState<"COMPANY_REJECTED" | "CANDIDATE_DECLINED">(
    "COMPANY_REJECTED",
  );
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (candidate) {
      setType("COMPANY_REJECTED");
      setReason("");
    }
  }, [candidate]);

  const willEmail = opening.autoNotify && Boolean(candidate?.email);

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {candidate?.fullName}</DialogTitle>
          <DialogDescription>
            Record who ended the process. This is kept in the candidate&apos;s
            history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who rejected?</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as typeof type)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY_REJECTED">
                  We rejected the candidate
                </SelectItem>
                <SelectItem value="CANDIDATE_DECLINED">
                  Candidate declined / withdrew
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason <span className="text-muted-foreground">(optional, internal)</span>
            </Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Not enough experience with statutory audits"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {willEmail
              ? "A polite rejection email is sent automatically (auto-notify is on)."
              : candidate?.email
                ? "No email is sent — auto-notify is off for this opening."
                : "No email is sent — the candidate has no email on file."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              onConfirm({
                rejectionType: type,
                rejectionReason: reason.trim() || undefined,
              })
            }
          >
            Reject candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Approval move — capture salary/CTC details for the approval email. */
export function ApproveDialog({
  candidate,
  onConfirm,
  onCancel,
}: GateDialogProps) {
  const [ctc, setCtc] = useState("");

  useEffect(() => {
    if (candidate) setCtc("");
  }, [candidate]);

  const canEmail = Boolean(candidate?.email);

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve {candidate?.fullName} 🎉</DialogTitle>
          <DialogDescription>
            Salary / CTC details are included in the approval email and saved on
            the candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="ctc-details">Salary / CTC details</Label>
          <Textarea
            id="ctc-details"
            rows={4}
            value={ctc}
            onChange={(e) => setCtc(e.target.value)}
            placeholder={"e.g. CTC ₹12,00,000 per annum\nFixed: ₹10,80,000 · Variable: ₹1,20,000\nJoining: 1 September 2026"}
          />
          <p className="text-xs text-muted-foreground">
            {canEmail
              ? "A congratulations email with these details goes to the candidate."
              : "The candidate has no email on file — details are saved, no email is sent."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm({ ctcDetails: ctc.trim() || undefined, sendEmail: canEmail })
            }
          >
            {canEmail ? "Approve & send email" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
