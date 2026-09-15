import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp } from "lucide-react";
import V4Layout from "./V4Layout";
import { monthFinance, formatEuro } from "./mockData";

const FinanceMonthV4: React.FC = () => {
  const navigate = useNavigate();

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {monthFinance.month}
          </h1>
        </div>

        {/* Résumé */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Revenus pour vous</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-900">
              {formatEuro(monthFinance.revenue)}
            </p>
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              {monthFinance.trend}
            </span>
          </div>
          <p className="text-xs text-slate-400">{monthFinance.trendVs}</p>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">
                Chiffre d'affaires (logement)
              </span>
              <span className="font-semibold text-slate-900">
                {formatEuro(monthFinance.grossRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commission Hello Keys</span>
              <span className="font-semibold text-slate-900">
                - {formatEuro(monthFinance.commission)}
              </span>
            </div>
            <div className="flex justify-between rounded-xl bg-blue-50 px-3 py-2">
              <span className="font-semibold text-slate-900">
                Revenus pour vous
              </span>
              <span className="font-bold text-blue-700">
                {formatEuro(monthFinance.revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Détail des séjours */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Détail des séjours</h2>
          <div className="mt-3 space-y-3">
            {monthFinance.stays.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {s.label}
                  </p>
                  <p className="text-xs text-slate-500">{s.guest}</p>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {formatEuro(s.amount)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">— Ajustements</p>
              <p className="text-sm font-semibold text-emerald-600">
                + {formatEuro(monthFinance.adjustments)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </V4Layout>
  );
};

export default FinanceMonthV4;
