import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Mail, Phone, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ConnectivityMaintenancePage = () => {
  const restoredAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 px-6 py-8 sm:px-10 sm:py-10">
            <Badge className="mb-4 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              Système rétabli
            </Badge>

            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                La connectivité est entièrement rétablie
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                L&apos;incident de connectivité est désormais résolu et le service fonctionne de nouveau normalement.
                Nos équipes maintiennent une surveillance renforcée afin de confirmer la stabilité complète du système.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                <strong>Dernière mise à jour :</strong> {restoredAt}
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <Sparkles className="h-4 w-4" />
                  Statut actuel
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Rétabli</Badge>
                      Connectivité
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Le système est entièrement revenu à la normale et les services sont de nouveau disponibles.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Surveillance</Badge>
                      Suivi en cours
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Nous continuons à surveiller activement la plateforme pour garantir une stabilité durable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="grid gap-4 p-6 sm:p-10 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="w-full">
                    <h2 className="text-xl font-semibold text-slate-950">Suivi de statut</h2>
                    <div className="mt-4 space-y-4">
                      <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Rétabli</Badge>
                            <span className="text-sm font-medium text-slate-900">Système entièrement opérationnel</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Tous les services sont de nouveau disponibles. Dernière confirmation de rétablissement : {restoredAt}.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <div className="mt-0.5 rounded-full bg-sky-100 p-2 text-sky-700">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">Surveillance</Badge>
                            <span className="text-sm font-medium text-slate-900">Monitoring renforcé en cours</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Nous poursuivons la surveillance de la plateforme afin de confirmer la stabilité dans la durée.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Service normalisé</h2>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:text-base">
                      <p>
                        La connectivité est de nouveau opérationnelle et l&apos;ensemble du système a été rétabli.
                      </p>
                      <p>
                        Nous conservons toutefois une phase de surveillance active pour sécuriser le retour à la normale.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Dernière actualisation</h2>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:text-base">
                      <p>
                        Heure de mise à jour du statut : <strong>{restoredAt}</strong>
                      </p>
                      <p>
                        Cette page reste surveillée et sera mise à jour si un nouvel événement doit être signalé.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-950 text-white shadow-sm lg:col-span-2">
              <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/10 p-3 text-amber-300">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Besoin d&apos;aide ?</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                      Nous restons disponibles par téléphone pour vous accompagner en cas de blocage.
                    </p>
                  </div>
                </div>

                <Button asChild variant="secondary" className="rounded-full">
                  <Link to="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour au dashboard
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ConnectivityMaintenancePage;
