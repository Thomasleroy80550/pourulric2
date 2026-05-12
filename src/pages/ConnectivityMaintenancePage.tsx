import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Network,
  ShieldCheck,
  ServerCrash,
  Wrench,
} from "lucide-react";

import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const keyPoints = [
  {
    icon: ServerCrash,
    title: "Pourquoi le service est perturbé",
    description:
      "Notre fournisseur a temporairement limité les connexions par adresse IP. Cette restriction impacte directement l'accès à l'API de connectivité et provoque des interruptions ou des refus de connexion.",
  },
  {
    icon: Network,
    title: "Pourquoi la résolution n'est pas immédiate",
    description:
      "Votre service actuel ne permet pas de disposer d'une IPv4/IPv6 fixe. Sans IP stable, les échanges avec le fournisseur deviennent moins fiables dans le contexte de ses nouvelles limitations.",
  },
  {
    icon: ShieldCheck,
    title: "Ce que nous mettons en place",
    description:
      "Nous développons un proxy sur mesure pour stabiliser les connexions, sécuriser les échanges et retrouver un fonctionnement normal malgré les contraintes imposées par le fournisseur.",
  },
];

const ConnectivityMaintenancePage = () => {
  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="relative overflow-hidden rounded-[32px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_24px_80px_rgba(180,83,9,0.12)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.14),transparent_28%)]" />

          <div className="relative p-6 sm:p-8 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-amber-100 text-amber-900 hover:bg-amber-100">
                  Information maintenance
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                  Maintenance en cours sur l&apos;API de connectivité
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                  Nous souhaitons vous expliquer la situation avec transparence. Notre fournisseur a
                  limité certaines connexions IP, ce qui perturbe actuellement une partie des échanges
                  avec notre API de connectivité.
                </p>
                <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                  Votre service actuel ne permet pas d&apos;avoir une adresse IPv4/IPv6 fixe. Pour retrouver
                  une connexion stable et durable, nous devons donc développer un proxy sur mesure.
                </p>
              </div>

              <Card className="w-full max-w-md border-amber-200 bg-white/90 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
                        État actuel
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        Intervention technique active
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Nos équipes travaillent dur pour corriger ce problème et rétablir un service
                        pleinement stable aussi rapidement que possible.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                    Nous espérons un retour à la normale rapidement. Merci pour votre patience et votre
                    confiance pendant cette intervention.
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {keyPoints.map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.title} className="border-amber-100 bg-white/90 shadow-sm">
                    <CardContent className="p-6">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 w-fit">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardContent className="p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-amber-700" />
                    <h2 className="text-xl font-semibold text-slate-950">Ce que cela signifie pour vous</h2>
                  </div>

                  <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
                    <p>
                      Durant cette période, certaines connexions peuvent être plus lentes, intermittentes
                      ou temporairement indisponibles selon les appels concernés.
                    </p>
                    <p>
                      Il ne s&apos;agit pas d&apos;un abandon ou d&apos;une simple attente côté fournisseur : nous
                      adaptons activement notre architecture pour contourner proprement cette contrainte et
                      sécuriser le fonctionnement sur le long terme.
                    </p>
                    <p>
                      Notre priorité est de revenir à une situation normale avec une solution fiable,
                      propre et durable, plutôt qu&apos;un correctif fragile et temporaire.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-950 text-white shadow-sm">
                <CardContent className="p-6 sm:p-7">
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Mobilisation</p>
                  <h2 className="mt-3 text-2xl font-semibold">Nous travaillons dur pour corriger ce problème</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                    Le proxy sur mesure est en cours de développement afin de restaurer une connectivité
                    stable malgré les limitations IP imposées en amont.
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm leading-6 text-slate-200">
                      Dès que la situation sera stabilisée, le service reviendra à la normale et nous
                      continuerons à surveiller étroitement la qualité des connexions.
                    </p>
                  </div>

                  <Button asChild variant="secondary" className="mt-6 w-full rounded-full">
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
      </div>
    </MainLayout>
  );
};

export default ConnectivityMaintenancePage;
