import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, TrendingUp } from "lucide-react";
import V4Layout from "./V4Layout";
import StatementsList from "./StatementsList";
import { monthFinance, payouts, monthlyRevenueBars, formatEuro } from "./mockData";
import { cn } from "@/lib/utils";

const FinancesV4: React.FC = () => {
  const [tab, setTab] = useState<"overview" | "statements">("overview");
  const max = Math.max(...monthlyRevenueBars);

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Finances</h1>

        {/* Onglets */}
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          {(
            [
              { key: "overview", label: "Vue d'ensemble" },
              { key: "statements", label: "Relevés" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "bg-blue-600 text-white" : "text-slate-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <>
            {/* Sélecteur de mois */}
            <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Septembre 2026
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {/* Revenus du mois */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Revenus estimés ce mois-ci
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatEuro(monthFinance.revenue)}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    {monthFinance.trend}
                    <span className="font-normal text-slate-400">
                      {monthFinance.trendVs}
                    </span>
                  </p>
                </div>
                <div className="flex items-end gap-1 pb-1">
                  {monthlyRevenueBars.map((v, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-2 rounded-sm",
                        i === monthlyRevenueBars.length - 1
                          ? "bg-blue-600"
                          : "bg-blue-200"
                      )}
                      style={{ height: `${8 + (v / max) * 40}px` }}
                    />
                  ))}
                </div>
              </div>

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

              <Link
                to="/v4/finances/mois"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 py-2.5 text-sm font-semibold text-blue-600"
              >
                Voir le détail
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Prochains versements */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Prochains versements
              </h2>
              <div className="mt-3 space-y-3">
                {payouts.map((p) => (
                  <div
                    key={p.date}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {p.date}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatEuro(p.amount)}
                      </p>
                      <p className="text-xs text-slate-400">{p.label}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <StatementsList />
        )}
      </div>
    </V4Layout>
  );
};

export default FinancesV4;
