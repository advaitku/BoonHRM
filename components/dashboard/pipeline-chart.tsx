"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface PipelinePoint {
  week: string; // e.g. "12 May"
  added: number;
  rejected: number;
}

const chartConfig = {
  added: { label: "Added", color: "var(--chart-1)" },
  rejected: { label: "Rejected", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function PipelineChart({ data }: { data: PipelinePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline activity</CardTitle>
        <CardDescription>
          Candidates added and rejected per week — last 12 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: 4, right: 4 }}>
            <defs>
              <linearGradient id="fillAdded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-added)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-added)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillRejected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rejected)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-rejected)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="added"
              type="monotone"
              fill="url(#fillAdded)"
              stroke="var(--color-added)"
              strokeWidth={2}
            />
            <Area
              dataKey="rejected"
              type="monotone"
              fill="url(#fillRejected)"
              stroke="var(--color-rejected)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
