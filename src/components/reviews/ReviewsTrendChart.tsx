/** @jsxImportSource react */
import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { parseISO, isValid, format, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Review } from '@/lib/reviews-api';

const chartConfig = {
  count: {
    label: "Nombre d'avis",
    color: 'hsl(var(--primary))',
  },
  avg: {
    label: 'Note moyenne',
    color: 'hsl(38 92% 50%)',
  },
} satisfies ChartConfig;

interface Props {
  reviews: Review[];
  months?: number;
}

const ReviewsTrendChart: React.FC<Props> = ({ reviews, months = 12 }) => {
  const data = useMemo(() => {
    const now = startOfMonth(new Date());
    const buckets: { key: string; label: string; count: number; sum: number }[] = [];
    const indexByKey = new Map<string, number>();

    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      indexByKey.set(key, buckets.length);
      buckets.push({
        key,
        label: format(d, 'MMM yy', { locale: fr }),
        count: 0,
        sum: 0,
      });
    }

    reviews.forEach((review) => {
      if (!review.rawDate) return;
      const parsed = parseISO(review.rawDate);
      if (!isValid(parsed)) return;
      const key = format(startOfMonth(parsed), 'yyyy-MM');
      const idx = indexByKey.get(key);
      if (idx === undefined) return;
      buckets[idx].count += 1;
      buckets[idx].sum += review.rating;
    });

    return buckets.map((b) => ({
      label: b.label,
      count: b.count,
      avg: b.count > 0 ? Math.round((b.sum / b.count) * 10) / 10 : null,
    }));
  }, [reviews, months]);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <ComposedChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={12}
        />
        <YAxis
          yAxisId="count"
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="avg"
          orientation="right"
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value, name) => {
                const label = name === 'count' ? "Avis" : 'Note moyenne';
                const display = name === 'avg' ? `${value} / 5` : value;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium tabular-nums text-foreground">{display}</span>
                  </div>
                );
              }}
            />
          }
        />
        <Area
          yAxisId="count"
          dataKey="count"
          type="monotone"
          fill="url(#fillCount)"
          stroke="var(--color-count)"
          strokeWidth={2.5}
        />
        <Line
          yAxisId="avg"
          dataKey="avg"
          type="monotone"
          stroke="var(--color-avg)"
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
};

export default ReviewsTrendChart;
