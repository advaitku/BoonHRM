"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseISODate, toISODate } from "@/components/ui/date-picker";
import {
  DEADLINE_URGENCY_CLASS,
  daysUntil,
  deadlineInfo,
} from "@/lib/deadline";

export interface CalendarWidgetEvent {
  /** Unique key: application id, or `${openingId}-closure` / `-interview`. */
  id: string;
  /** `yyyy-mm-dd` (UTC date slice — parsed with parseISODate on this side). */
  date: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

// modifiersClassNames lands on the day <td>; the DayButton is its direct child
// (relative + isolate), so the dot is drawn on the button via the `*:` variant.
const DOT_CLASS =
  "*:after:pointer-events-none *:after:absolute *:after:bottom-0.5 *:after:left-1/2 *:after:size-1 *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary *:after:content-[''] *:data-[selected-single=true]:after:bg-primary-foreground";

export function DateCalendarWidget({
  title,
  description,
  events,
  emptyMessage,
  maxListItems = 6,
}: {
  title: string;
  description: string;
  /** Sorted ascending by date (the server does the sort). */
  events: CalendarWidgetEvent[];
  emptyMessage: string;
  maxListItems?: number;
}) {
  const [selected, setSelected] = React.useState<Date | undefined>();
  const [month, setMonth] = React.useState<Date>(() => new Date());

  const eventDates = React.useMemo(
    () =>
      events
        .map((e) => parseISODate(e.date))
        .filter((d): d is Date => Boolean(d)),
    [events],
  );

  const visible = selected
    ? events.filter((e) => e.date === toISODate(selected))
    : events
        .filter((e) => daysUntil(parseISODate(e.date)!) >= 0)
        .slice(0, maxListItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ event: eventDates }}
            modifiersClassNames={{ event: DOT_CLASS }}
            showOutsideDays={false}
            className="mx-auto shrink-0 sm:mx-0"
          />
          <div className="min-w-0 flex-1">
            {selected && (
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Showing {dateFmt.format(selected)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(undefined)}
                >
                  Clear
                </Button>
              </div>
            )}
            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {selected
                  ? "Nothing on this day."
                  : events.length === 0
                    ? emptyMessage
                    : "Nothing upcoming."}
              </p>
            ) : (
              <div className="max-h-64 divide-y overflow-y-auto">
                {visible.map((event) => {
                  const info = deadlineInfo(parseISODate(event.date)!);
                  return (
                    <Link
                      key={event.id}
                      href={event.href}
                      className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {event.title}
                          </span>
                          {event.badge && (
                            <Badge variant="outline">{event.badge}</Badge>
                          )}
                        </div>
                        {event.subtitle && (
                          <p className="truncate text-sm text-muted-foreground">
                            {event.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm">
                          {dateFmt.format(parseISODate(event.date)!)}
                        </div>
                        <div
                          className={`text-xs ${DEADLINE_URGENCY_CLASS[info.urgency]}`}
                        >
                          {info.label}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
