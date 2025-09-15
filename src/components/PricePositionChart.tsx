"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface PricePositionChartProps {
  data: {
    userAveragePrice: number;
    competitorAveragePrice: number;
  };
}

export function PricePositionChart({ data }: PricePositionChartProps) {
  const chartData = [
    { label: "Votre Prix Moyen", value: data.userAveragePrice, fill: "var(--color-user)" },
    { label: "Moyenne Concurrents", value: data.competitorAveragePrice, fill: "var(--color-competitors)" },
  ];

  const chartConfig = {
    value: {
      label: "Prix (€)",
    },
    user: {
      label: "Votre Prix Moyen",
      color: "hsl(var(--chart-1))",
    },
    competitors: {
      label: "Moyenne Concurrents",
      color: "hsl(var(--chart-2))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positionnement Tarifaire</CardTitle>
        <CardDescription>Prix moyen pour les 90 prochains jours</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${value}€`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}