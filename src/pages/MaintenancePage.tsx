import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Database, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceStatuses, type ServiceStatusValue } from "@/lib/status-api";

const statusLabels: Record<ServiceStatusValue, { label: string; color: string }> = {
  operational: { label: "Opérationnel", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  degraded: { label: "Dégradé", color: "bg-amber-50 text-amber-800 border-amber-200" },
  outage: { label: "Panne", color: "bg-red-50 text-red-800 border-red-200" },
  maintenance: { label: "Maintenance", color: "bg-blue-50 text-blue-800 border-blue-200" },
};

export default function MaintenancePage() {
  const { data: statuses, isPending, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["maintenance-service-statuses"],
    queryFn: getServiceStatuses,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="mx-auto max-w-2xl space-y-5 text-center">
          <p className="text-lg font-bold tracking-tight">Hello Keys<span className="text-red-700">.</span></p>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-700">
            <Wrench className="h-8 w-8" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Maintenance en cours
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Votre plateforme fait peau neuve</h1>
          <p className="text-base leading-relaxed text-slate-600">Nous transférons vos données vers notre nouveau logiciel hôtelier. L’espace propriétaire est temporairement indisponible pendant cette opération.</p>
          <p className="text-sm font-medium text-slate-600">Période de migration annoncée : du 16 au 18 novembre 2026.</p>
        </header>

        <Card className="border-red-200 bg-white text-slate-900 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div className="space-y-2 text-sm leading-relaxed">
              <p className="font-semibold">Nos équipes sont mobilisées pour le transfert des données.</p>
              <p className="text-slate-600">Aucun support client ne sera assuré pendant cette période. Retrouvez ci-dessous les dernières informations sur le transfert et l’état de nos services.</p>
              <p className="text-slate-600">Merci pour votre patience et votre confiance.</p>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="service-status-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="service-status-title" className="text-xl font-bold">Statut du transfert et des services</h2>
              <p className="mt-1 text-xs text-slate-500">Actualisation automatique toutes les 30 secondes.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100">
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Actualiser
            </Button>
          </div>

          {isPending && <p role="status" className="text-sm text-slate-500">Chargement des statuts…</p>}
          {isError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Impossible d’actualiser les statuts pour le moment. Une nouvelle tentative sera effectuée automatiquement.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {statuses?.map((service) => (
              <Card key={service.id} className="border-slate-200 bg-white text-slate-900 shadow-sm">
                <CardHeader className="space-y-3 pb-3">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusLabels[service.status].color}`}>
                    {service.status === "operational" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Wrench className="h-3.5 w-3.5" aria-hidden="true" />}
                    {statusLabels[service.status].label}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.message && <p className="text-sm leading-relaxed text-slate-600">{service.message}</p>}
                  <p className="text-xs text-slate-500">Mis à jour le {new Date(service.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris)</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {statuses?.length === 0 && <p className="text-sm text-slate-500">Aucune information de service publiée pour le moment.</p>}
          {dataUpdatedAt > 0 && <p className="text-xs text-slate-500">Dernière consultation : {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR")}</p>}
        </section>

        <footer className="border-t border-slate-200 pt-5 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline">Accès administration <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
        </footer>
      </div>
    </main>
  );
}
