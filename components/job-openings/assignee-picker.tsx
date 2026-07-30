"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { setJobOpeningAssignee } from "@/lib/actions/job-openings";
import { getInitials } from "@/lib/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AssignableUser {
  id: string;
  name: string;
}

export function AssigneePicker({
  openingId,
  assignedToId,
  users,
}: {
  openingId: string;
  assignedToId: string | null;
  users: AssignableUser[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    const userId = value === "unassigned" ? null : value;
    startTransition(async () => {
      const result = await setJobOpeningAssignee(openingId, userId);
      if (result.ok) {
        const name = users.find((u) => u.id === userId)?.name;
        toast.success(name ? `Assigned to ${name}` : "Unassigned");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const assignee = users.find((u) => u.id === assignedToId);

  return (
    <Select value={assignedToId ?? "unassigned"} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-auto gap-2 border-dashed" size="sm">
        {assignee ? (
          <Avatar size="sm">
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
              {getInitials(assignee.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <UserPlus className="size-4 text-muted-foreground" />
        )}
        <SelectValue placeholder="Assign">
          {assignee ? assignee.name : "Unassigned"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
