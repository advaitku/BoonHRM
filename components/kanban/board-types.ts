import type { RejectionType, Stage } from "@/lib/generated/prisma/enums";

export interface BoardCandidate {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  stage: Stage;
  stageEnteredAt: string; // ISO
  hasResume: boolean;
  rejectionType: RejectionType | null;
  tags: { id: string; name: string; color: string }[];
  commentCount: number;
}

export interface BoardOpening {
  id: string;
  onlineInterviewUrl: string | null;
  inPersonInterviewUrl: string | null;
  autoNotify: boolean;
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
