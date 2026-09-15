import React from "react";
import { Download, ChevronDown } from "lucide-react";
import { statements, formatEuro } from "./mockData";

const StatementsList: React.FC = () => (
  <div className="space-y-3">
    <button className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
      2026
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>

    <div className="rounded-2xl bg-white shadow-sm">
      {statements.map((s) => (
        <div
          key={s.month}
          className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{s.month}</p>
            <p className="text-sm text-slate-500">{formatEuro(s.amount)}</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
            <Download className="h-3.5 w-3.5" />
            Télécharger
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default StatementsList;
