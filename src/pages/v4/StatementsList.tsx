import React, { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { SavedInvoice } from "@/lib/admin-api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import StatementDetailsDialog from "@/components/StatementDetailsDialog";
import { statementDate, statementNet, formatEuro } from "./v4-data";

interface StatementsListProps {
  statements: SavedInvoice[];
  isLoading: boolean;
}

const StatementsList: React.FC<StatementsListProps> = ({
  statements,
  isLoading,
}) => {
  const years = useMemo(() => {
    const set = new Set<number>();
    statements.forEach((s) => {
      const d = statementDate(s);
      if (d) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [statements]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const year = selectedYear ?? (years[0] ? String(years[0]) : null);

  const list = statements.filter((s) => {
    if (!year) return true;
    const d = statementDate(s);
    return d && String(d.getFullYear()) === year;
  });

  const [selected, setSelected] = useState<SavedInvoice | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Aucun relevé disponible pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {year && (
        <Select value={year} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-auto w-full justify-between rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:ring-0">
            {year}
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="rounded-2xl bg-white shadow-sm">
        {list.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <div>
              <p className="text-sm font-semibold capitalize text-slate-900">
                {s.period}
              </p>
              <p className="text-sm text-slate-500">
                {formatEuro(statementNet(s))}
              </p>
            </div>
            <button
              onClick={() => setSelected(s)}
              className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir
            </button>
          </div>
        ))}
      </div>

      <StatementDetailsDialog
        isOpen={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        statement={selected}
      />
    </div>
  );
};

export default StatementsList;
