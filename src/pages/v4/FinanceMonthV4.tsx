import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useV4Statements,
  sortStatements,
  statementCA,
  statementNet,
  statementDate,
  formatEuro,
} from "./v4-data";
import { cn } from "@/lib/utils";

const FinanceMonthV4: React.FC = () => {
  const navigate = useNavigate();
  const { period } = useParams();
  const { data: statements, isLoading } = useV4Statements();
  const sorted = useMemo(() => sortStatements(statements ?? []), [statements]);

  const current =
    sorted.find((s) => s.period === decodeURIComponent(period ?? "")) ?? null;

  const ca = current ? statementCA(current) : 0;
  const net = current ? statementNet(current) : 0;
  const commission = Math.max(0, ca - net);

  const trend = useMemo(() => {
    if (!current) return null;
    const d = statementDate(current);
    if (!d) return null;
    const prev = sorted.find((s) => {
      const pd = statementDate(s);
      return (
        pd &&
        pd.getMonth() === d.getMonth() &&
        pd.getFullYear() === d.getFullYear() - 1
      );
    });
    if (!prev) return null;
    const prevNet = statementNet(prev);
    if (prevNet <= 0) return null;
    const pct = Math.round(((net - prevNet) / prevNet) * 100);
    return { pct, label: `vs ${prev.period.toLowerCase()}` };
  }, [current, sorted, net]);

  const rows: any[] = Array.isArray(current?.invoice_data)
    ? current!.invoice_data
    : [];

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
          <h1 className="text-2xl font-bold capitalize text-slate-900">
            {current?.period ?? "Détail du mois"}
          </h1>
        </div>

        {isLoading && <Skeleton className="h-64 w-full rounded-2xl" />}

        {!isLoading && !current && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Relevé introuvable.
          </p>
        )}

        {current && (
          <>
            {/* Résumé */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Revenus pour vous</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-slate-900">
                  {formatEuro(net)}
                </p>
                {trend && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-sm font-semibold",
                      trend.pct >= 0 ? "text-emerald-600" : "text-rose-500"
                    )}
                  >
                    {trend.pct >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {trend.pct >= 0 ? "+" : ""}
                    {trend.pct} %
                  </span>
                )}
              </div>
              {trend && <p className="text-xs text-slate-400">{trend.label}</p>}

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Chiffre d'affaires (logement)
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatEuro(ca)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frais & commission</span>
                  <span className="font-semibold text-slate-900">
                    - {formatEuro(commission)}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-blue-50 px-3 py-2">
                  <span className="font-semibold text-slate-900">
                    Revenus pour vous
                  </span>
                  <span className="font-bold text-blue-700">
                    {formatEuro(net)}
                  </span>
                </div>
              </div>
            </div>

            {/* Détail des séjours */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">Détail des séjours</h2>
              <div className="mt-3 space-y-3">
                {rows.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Aucun séjour sur cette période.
                  </p>
                )}
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {row.voyageur || "Voyageur"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.arrivee ? `Arrivée : ${row.arrivee}` : ""}
                        {row.portail ? ` · ${row.portail}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {formatEuro(row.prixSejour || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </V4Layout>
  );
};

export default FinanceMonthV4;
