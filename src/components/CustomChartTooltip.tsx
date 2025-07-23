import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter, labelFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="p-2 border-b">
          <CardTitle className="text-sm">
            {labelFormatter ? labelFormatter(label || '') : label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 text-sm">
          {payload.map((pld, index) => (
            <div key={index} style={{ color: pld.color || pld.stroke }}>
              {`${pld.name}: `}
              <span className="font-bold">
                {formatter ? formatter(pld.value, pld.name) : pld.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default CustomChartTooltip;