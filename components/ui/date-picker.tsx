"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const displayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** `yyyy-mm-dd` → local Date. Parsed part-wise so the day never shifts by timezone. */
export function parseISODate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** local Date → `yyyy-mm-dd` (what the server actions and `<input type="date">` expect). */
export function toISODate(date: Date | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface DatePickerProps {
  id?: string;
  /** Renders a hidden input so the value is picked up by `new FormData(form)`. */
  name?: string;
  /** Controlled `yyyy-mm-dd`. Omit for uncontrolled use with `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest selectable day, `yyyy-mm-dd`. */
  min?: string;
  /** Latest selectable day, `yyyy-mm-dd`. */
  max?: string;
  className?: string;
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date",
  disabled,
  min,
  max,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const selected = parseISODate(current);
  const minDate = parseISODate(min);
  const maxDate = parseISODate(max);

  function commit(next: string) {
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function select(date: Date | undefined) {
    commit(toISODate(date));
    if (date) setOpen(false);
  }

  const matchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  // Year dropdown range — wide enough for both past joining dates and future deadlines.
  const pivot = selected ?? new Date();
  const startMonth = minDate ?? new Date(pivot.getFullYear() - 3, 0);
  const endMonth = maxDate ?? new Date(pivot.getFullYear() + 5, 11);

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {selected ? displayFmt.format(selected) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={select}
            defaultMonth={selected ?? minDate ?? undefined}
            disabled={matchers.length ? matchers : undefined}
            startMonth={startMonth}
            endMonth={endMonth}
            captionLayout="dropdown"
            autoFocus
          />
          <div className="flex items-center justify-between border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                commit("");
                setOpen(false);
              }}
              disabled={!selected}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => select(new Date())}
              disabled={Boolean(minDate && new Date() < minDate)}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
