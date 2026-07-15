"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, TagIcon, X } from "lucide-react";
import {
  addTagToCandidate,
  removeTagFromCandidate,
} from "@/lib/actions/tags";
import { tagChipClass } from "@/lib/tag-colors";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TagChip {
  id: string;
  name: string;
  color: string;
}

export function CandidateTags({
  candidateId,
  tags,
  suggestions,
}: {
  candidateId: string;
  tags: TagChip[];
  suggestions: TagChip[]; // all existing tags (for autocomplete)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const attached = new Set(tags.map((t) => t.id));
  const available = suggestions.filter((s) => !attached.has(s.id));
  const trimmed = query.trim().replace(/\s+/g, " ");
  const exactExists = suggestions.some(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function add(name: string) {
    setOpen(false);
    setQuery("");
    startTransition(async () => {
      const result = await addTagToCandidate(candidateId, name);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(tagId: string) {
    startTransition(async () => {
      const result = await removeTagFromCandidate(candidateId, tagId);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TagIcon className="size-3.5 text-muted-foreground" />
      {tags.length === 0 && (
        <span className="text-xs text-muted-foreground">No tags</span>
      )}
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium",
            tagChipClass(tag.color),
          )}
        >
          {tag.name}
          <button
            type="button"
            aria-label={`Remove tag ${tag.name}`}
            disabled={pending}
            onClick={() => remove(tag.id)}
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            disabled={pending}
          >
            <Plus className="size-3" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create a tag…"
              value={query}
              onValueChange={setQuery}
              maxLength={40}
            />
            <CommandList>
              <CommandEmpty>
                {trimmed ? "No matching tags" : "Type to create a tag"}
              </CommandEmpty>
              {available.length > 0 && (
                <CommandGroup heading="Existing tags">
                  {available.map((s) => (
                    <CommandItem key={s.id} value={s.name} onSelect={() => add(s.name)}>
                      <span
                        className={cn(
                          "inline-block size-2 border",
                          tagChipClass(s.color),
                        )}
                      />
                      {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {trimmed && !exactExists && (
                <CommandGroup heading="New">
                  <CommandItem value={`create-${trimmed}`} onSelect={() => add(trimmed)}>
                    <Plus className="size-3.5" />
                    Create “{trimmed}”
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
