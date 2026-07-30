"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/lib/actions/comments";
import { getInitials } from "@/lib/initials";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export interface CommentItem {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string; // ISO
}

export function CommentsPanel({
  candidateId,
  comments,
  currentUserId,
  isAdmin,
}: {
  candidateId: string;
  comments: CommentItem[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function post(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addComment(candidateId, body);
      if (result.ok) {
        setDraft("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={post}>
        <Card>
          <CardContent className="space-y-3 pt-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note for the team — interview impressions, follow-ups, salary discussions…"
              rows={3}
              maxLength={5000}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") post(e);
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Visible to the whole team · Ctrl+Enter to post
              </p>
              <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
                <Send className="size-3.5" />
                {pending ? "Posting…" : "Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {comments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquare className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No discussion yet — be the first to leave a note.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const initials = getInitials(c.authorName);
            const canDelete = isAdmin || c.authorId === currentUserId;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar className="mt-0.5 size-8 rounded-full">
                  <AvatarFallback className="bg-muted text-xs font-semibold">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{c.authorName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {fmt.format(new Date(c.createdAt))}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          aria-label="Delete comment"
                          disabled={pending}
                          onClick={() => remove(c.id)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
