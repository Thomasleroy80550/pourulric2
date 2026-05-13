import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Mail, Phone, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ConnectivityMaintenancePage = () => {
  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-6 py-8 sm:px-10 sm:py-10">
            <Badge className="mb-4 bg-amber-100 text-amber-900 hover:bg-amber-100">
              Maintenance connectivité
            </Badge>

            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Une intervention technique est en cours
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                Notre fournisseur a récemment limité les connexions IP. Comme le service actuel ne permet
                pas de disposer d&apos;une IPv4/IPv6 fixe, nous devons mettre en place un proxy sur mesure pour
                retrouver un fonctionnement pleinement stable.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                En attendant, nous avons ajouté une <strong>vue iCal</strong> dans le calendrier afin de vous
                permettre de continuer à consulter vos réservations.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                Pour le moment, les <strong>blocages propriétaire</strong> restent indisponibles. Si vous souhaitez
                bloquer votre logement, merci de nous envoyer un email.
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <Sparkles className="h-4 w-4" />
                  Dernières mises à jour déployées
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Nouveau</Badge>
                      Calendrier
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Une <strong>vue iCal</strong> a été ajoutée pour vous permettre de voir vos réservations pendant la maintenance.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-amber-100">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700">
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Temporaire</Badge>
                      Blocage propriétaire
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Les blocages propriétaire restent désactivés pour le moment. Pour bloquer un logement, merci de nous écrire par email.
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
                            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Mise à jour effectuée</Badge>
                            <span className="text-sm font-medium text-slate-900">Vue iCal ajoutée</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Vous pouvez désormais consulter vos réservations depuis la nouvelle vue iCal disponible dans le calendrier.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">En attente</Badge>
                            <span className="text-sm font-medium text-slate-900">Blocages propriétaire toujours indisponibles</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Si vous souhaitez bloquer votre logement pendant cette période, merci de nous envoyer un email et nous le ferons pour vous.
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
                    <h2 className="text-xl font-semibold text-slate-950">Vue iCal disponible</h2>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:text-base">
                      <p>
                        Une vue iCal a été ajoutée dans votre calendrier pour vous permettre de voir vos
                        réservations malgré l&apos;incident en cours.
                      </p>
                      <p>
                        La distribution de vos annonces sur les plateformes n&apos;est pas impactée.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Blocages par email</h2>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:text-base">
                      <p>
                        Pour le moment, les blocages propriétaire sont toujours indisponibles.
                      </p>
                      <p>
                        Si vous souhaitez bloquer votre logement, merci de nous faire un email pendant la
                        durée de l&apos;intervention.
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
