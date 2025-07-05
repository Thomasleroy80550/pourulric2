import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChartFullScreenDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chartData: any[];
  chartType: 'line' | 'bar';
  title: string;
  description?: string;
  dataKeys: { key: string; name: string; color: string; }[];
  yAxisUnit?: string;
}

const ChartFullScreenDialog: React.FC<ChartFullScreenDialogProps> = ({
  isOpen,
  onOpenChange,
  chartData,
  chartType,
  title,
  description,
  dataKeys,
  yAxisUnit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[1000px] h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-grow w-full h-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                <YAxis unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => `${value}${yAxisUnit || ''}`}
                />
                <Legend />
                {dataKeys.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    stroke={item.color}
                    name={item.name}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                <YAxis unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => `${value}${yAxisUnit || ''}`}
                />
                <Legend />
                {dataKeys.map((item) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    fill={item.color}
                    name={item.name}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartFullScreenDialog;