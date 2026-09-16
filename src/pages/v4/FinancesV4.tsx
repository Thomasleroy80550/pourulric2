import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import V4Layout from "./V4Layout";
import StatementsList from "./StatementsList";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  useV4Statements,
  sortStatements,
  statementCA,
  statementNet,
  statementDate,
  formatEuro,
} from "./v4-data";
import { cn } from "@/lib/utils";

const FinancesV4: React.FC = () => {
  const [tab, setTab] = useState<"overview" | "statements">("overview");
  const { data: statements, isLoading } = useV4Statements();
  const sorted = useMemo(() => sortStatements(statements ?? []), [statements]);

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const current =
    sorted.find((s) => s.period === selectedPeriod) ?? sorted[0] ?? null;

  const ca = current ? statementCA(current) : 0;
  const net = current ? statementNet(current) : 0;
  const commission = Math.max(0, ca - net);

  // Comparaison avec le même mois de l'année précédente
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

  // Barres : les 7 derniers relevés (ordre chronologique)
  const bars = useMemo(() => {
    const last = sorted.slice(0, 7).reverse();
    return last.map((s) => Math.max(0, statementNet(s)));
  }, [sorted]);
  const maxBar = Math.max(1, ...bars);

  // Derniers versements
  const payouts = sorted.slice(0, 2);

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
                tab === t.key ? "bg-hk-600 text-white" : "text-slate-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <>
            {isLoading && (
              <>
                <Skeleton className="h-10 w-40 rounded-full" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </>
            )}

            {!isLoading && !current && (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                Aucun relevé disponible pour le moment. Vos revenus apparaîtront
                ici dès votre premier relevé.
              </p>
            )}

            {current && (
              <>
                {/* Sélecteur de mois */}
                <Select
                  value={current.period}
                  onValueChange={(v) => setSelectedPeriod(v)}
                >
                  <SelectTrigger className="h-auto w-auto gap-2 rounded-full border-0 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:ring-0">
                    <span className="capitalize">{current.period}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {sorted.map((s) => (
                      <SelectItem key={s.id} value={s.period}>
                        <span className="capitalize">{s.period}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Revenus du mois */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Revenus ce mois-ci
                      </p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">
                        {formatEuro(net)}
                      </p>
                      {trend && (
                        <p
                          className={cn(
                            "mt-2 flex items-center gap-1 text-sm font-semibold",
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
                          <span className="font-normal text-slate-400">
                            {trend.label}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-end gap-1 pb-1">
                      {bars.map((v, i) => (
                        <span
                          key={i}
                          className={cn(
                            "w-2 rounded-sm",
                            i === bars.length - 1 ? "bg-hk-600" : "bg-hk-200"
                          )}
                          style={{ height: `${8 + (v / maxBar) * 40}px` }}
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
                        {formatEuro(ca)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frais & commission</span>
                      <span className="font-semibold text-slate-900">
                        - {formatEuro(commission)}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-hk-50 px-3 py-2">
                      <span className="font-semibold text-slate-900">
                        Revenus pour vous
                      </span>
                      <span className="font-bold text-hk-700">
                        {formatEuro(net)}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/v4/finances/mois/${encodeURIComponent(current.period)}`}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-hk-200 py-2.5 text-sm font-semibold text-hk-600"
                  >
                    Voir le détail
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Derniers versements */}
                {payouts.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="font-semibold text-slate-900">
                      Derniers versements
                    </h2>
                    <div className="mt-3 space-y-3">
                      {payouts.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-semibold capitalize text-slate-900">
                              {p.period}
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              {formatEuro(statementNet(p))}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              p.is_paid
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {p.is_paid ? "Versé" : "À venir"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <StatementsList statements={sorted} isLoading={isLoading} />
        )}
      </div>
    </V4Layout>
  );
};

export default FinancesV4;
