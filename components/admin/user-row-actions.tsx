"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { setUserRole, toggleUserBanned } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionResult } from "@/lib/actions/users";

export function UserRowActions({
  userId,
  role,
  banned,
  isSelf,
}: {
  userId: string;
  role: string;
  banned: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {role === "admin" ? (
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => run(() => setUserRole(userId, "hr"))}
          >
            Change to HR
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => run(() => setUserRole(userId, "admin"))}>
            Make admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSelf}
          variant="destructive"
          onClick={() => run(() => toggleUserBanned(userId))}
        >
          {banned ? "Enable account" : "Disable account"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
