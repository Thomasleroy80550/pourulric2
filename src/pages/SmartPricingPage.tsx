import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Euro,
  Hotel,
  LineChart,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const marketFactors = [
  { label: "Saisonnalité", icon: CalendarDays },
  { label: "Événements locaux", icon: MapPin },
  { label: "Vacances scolaires", icon: Users },
  { label: "Ponts et jours fériés", icon: Sparkles },
  { label: "Météo", icon: CloudSun },
  { label: "Offre concurrente", icon: Hotel },
  { label: "Demande voyageurs", icon: Search },
];

const beyondAnalyses = [
  "réservations déjà enregistrées",
  "demande du marché",
  "événements locaux",
  "vacances et jours fériés",
  "tendances de recherche",
  "prix des logements comparables",
  "historique des performances",
];

const helloKeysActions = [
  "définissent les paramètres du logement",
  "fixent les limites minimales et maximales",
  "surveillent les performances",
  "interviennent manuellement lorsque cela est nécessaire",
];

const benefits = [
  "davantage de revenus sur l’année",
  "meilleure réactivité face au marché",
  "optimisation des périodes fortes",
  "amélioration du taux d’occupation",
  "moins de nuits vacantes",
  "adaptation automatique aux évolutions du marché",
];

const demandBars = [
  { label: "Janv.", value: 38, price: "95 €" },
  { label: "Avr.", value: 58, price: "120 €" },
  { label: "Juil.", value: 92, price: "178 €" },
  { label: "Août", value: 100, price: "195 €" },
  { label: "Nov.", value: 32, price: "88 €" },
];

const SmartPricingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:px-10 lg:py-16">
          <div className="flex-1">
            <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Smart Pricing by Hello Keys
            </Badge>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Pourquoi adapter ses tarifs au marché est essentiel
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-sky-50/90">
              En location saisonnière, le bon prix n’est jamais figé. Il évolue avec le marché, la demande et le calendrier local. Une tarification dynamique permet de vendre chaque nuit au prix le plus juste pour maximiser vos revenus tout en conservant un excellent taux d’occupation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-sky-50">
                <a href="#benefices">
                  Voir les bénéfices
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href="#hello-keys">Comprendre le rôle de Hello Keys</a>
              </Button>
            </div>
          </div>

          <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur lg:w-[420px]">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20">
                <LineChart className="h-7 w-7 text-emerald-200" />
              </div>
              <CardTitle className="text-2xl">Un marché qui bouge tous les jours</CardTitle>
              <CardDescription className="text-sky-50/80">
                Le prix recommandé s’adapte aux signaux réels du marché, pas à une intuition figée plusieurs mois à l’avance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandBars.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.price}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-300"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-sky-50/90">
                Exemple : une nuit d’août ou de grand événement ne doit pas être vendue comme une nuit calme de novembre.
              </p>
            </CardContent>
          </Card>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge variant="outline" className="mb-4 bg-white">Marché réel</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">La demande n’est jamais la même d’une semaine à l’autre</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Le marché de la location saisonnière évolue constamment. Un prix pertinent doit tenir compte de nombreux éléments qui influencent directement la volonté des voyageurs de réserver.
              </p>
              <div className="mt-6 rounded-3xl border border-sky-100 bg-sky-50 p-6">
                <p className="font-semibold text-sky-950">À retenir</p>
                <p className="mt-2 leading-7 text-slate-700">
                  Un prix fixe toute l’année entraîne souvent deux problèmes : vous perdez de l’argent lorsque la demande est forte, et vous perdez des réservations lorsque la demande est faible.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {marketFactors.map((factor) => (
                <Card key={factor.label} className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <factor.icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-slate-800">{factor.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-4">Exemple concret</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Le piège du tarif unique</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Afficher un logement à 120 € toute l’année peut sembler simple. En réalité, ce tarif unique peut coûter cher.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card className="border-red-100 bg-red-50/70 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-red-100 p-3 text-red-700">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>En forte demande : revenu perdu</CardTitle>
                      <CardDescription>Vacances, événement local, week-end prolongé</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-500">Tarif fixe</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">120 €</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Prix de marché possible</p>
                        <p className="mt-1 text-3xl font-bold text-emerald-700">180 €</p>
                      </div>
                    </div>
                    <Separator className="my-5" />
                    <p className="leading-7 text-slate-700">
                      Sur 5 nuits réservées, l’écart représente <strong>300 € de revenu potentiel non capté</strong>. Le logement se loue, mais pas au meilleur prix.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-amber-50/80 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>En période creuse : nuits vacantes</CardTitle>
                      <CardDescription>Mois calme, météo moins favorable, demande plus faible</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-500">Tarif fixe</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">120 €</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Tarif plus compétitif</p>
                        <p className="mt-1 text-3xl font-bold text-sky-700">95 €</p>
                      </div>
                    </div>
                    <Separator className="my-5" />
                    <p className="leading-7 text-slate-700">
                      Si le prix reste trop haut, le voyageur choisit un autre logement. Mieux vaut parfois vendre une nuit au bon prix que laisser le calendrier vide.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <Badge className="mb-4 bg-sky-700 hover:bg-sky-700">Smart Pricing</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Qu’est-ce que le Smart Pricing ?</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Le Smart Pricing, ou prix dynamique, consiste à ajuster les tarifs de votre logement en fonction de la réalité du marché. L’objectif n’est pas de proposer le prix le plus bas, mais le <strong>meilleur prix au bon moment</strong>.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Maximiser", text: "les revenus sur l’année", icon: Euro },
                  { title: "Maintenir", text: "un excellent taux d’occupation", icon: BarChart3 },
                  { title: "Rester", text: "compétitif face aux autres logements", icon: ShieldCheck },
                ].map((item) => (
                  <Card key={item.title} className="bg-white shadow-sm">
                    <CardContent className="p-5">
                      <item.icon className="h-7 w-7 text-sky-700" />
                      <p className="mt-4 text-lg font-bold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden border-sky-100 bg-white shadow-sm">
              <CardHeader className="bg-gradient-to-br from-sky-50 to-emerald-50">
                <CardTitle>Comparaison visuelle</CardTitle>
                <CardDescription>Deux stratégies, deux résultats possibles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="mb-2 flex justify-between text-sm font-medium">
                    <span>Tarif unique</span>
                    <span>Occasionnellement adapté</span>
                  </div>
                  <div className="h-4 rounded-full bg-slate-100">
                    <div className="h-4 w-[58%] rounded-full bg-slate-400" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm font-medium">
                    <span>Prix dynamique</span>
                    <span>Réactif au marché</span>
                  </div>
                  <div className="h-4 rounded-full bg-slate-100">
                    <div className="h-4 w-[86%] rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
                  </div>
                </div>
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  La tarification dynamique cherche le bon équilibre : augmenter les prix quand la demande le permet, et redevenir plus attractif lorsque le marché ralentit.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-slate-950 py-14 text-white">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <Badge className="mb-4 bg-white text-slate-950 hover:bg-white">Beyond Pricing</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Comment fonctionne Beyond Pricing ?</h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Beyond Pricing est la solution de tarification dynamique utilisée par Hello Keys. Elle analyse automatiquement les signaux importants du marché et recommande des ajustements de prix chaque jour.
                </p>
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-4xl font-extrabold text-emerald-300">Des milliers</p>
                  <p className="mt-2 leading-7 text-slate-300">
                    d’analyses sont réalisées par l’algorithme pour suivre l’évolution de la demande et ajuster les tarifs recommandés quotidiennement.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {beyondAnalyses.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <span className="text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="hello-keys" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <Card className="border-emerald-100 bg-emerald-50 shadow-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <CardTitle>L’expertise Hello Keys reste au centre des décisions</CardTitle>
                <CardDescription>
                  La technologie aide à décider plus vite et plus finement, mais elle n’est jamais laissée seule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {helloKeysActions.map((action) => (
                    <div key={action} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-slate-700">Les équipes Hello Keys {action}.</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <Badge variant="outline" className="mb-4 bg-white">Humain + technologie</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Un pilotage encadré, pas automatique à l’aveugle</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Beyond Pricing fournit des recommandations puissantes. Hello Keys conserve le contrôle de la stratégie : le positionnement du logement, les limites de prix, les périodes sensibles et les ajustements exceptionnels restent suivis par nos équipes.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Technologie</p>
                  <p className="mt-2 text-2xl font-bold">Analyse quotidienne</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Hello Keys</p>
                  <p className="mt-2 text-2xl font-bold">Décision maîtrisée</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="benefices" className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge className="mb-4 bg-emerald-700 hover:bg-emerald-700">Résultats</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Les bénéfices pour votre logement</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Une stratégie dynamique vise à mieux vendre les nuits disponibles, au bon prix, sans vous demander de surveiller le marché chaque jour.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="rounded-full bg-emerald-100 p-1 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-slate-800">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <Card className="overflow-hidden border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
            <CardContent className="grid gap-8 p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:p-10">
              <div>
                <Badge variant="outline" className="mb-4 bg-white">Professionnels du tourisme</Badge>
                <h2 className="text-3xl font-bold tracking-tight">Une stratégie déjà utilisée par les professionnels</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Les compagnies aériennes, les hôtels et les grands acteurs du tourisme utilisent depuis des années la tarification dynamique pour optimiser leurs performances.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Avion", text: "Les prix varient selon les dates, le remplissage et la demande.", icon: Plane },
                  { title: "Hôtel", text: "Les tarifs montent lors des salons, vacances ou événements.", icon: Hotel },
                  { title: "Location", text: "Votre logement suit la même logique de marché.", icon: CalendarDays },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl bg-white p-6 shadow-sm">
                    <item.icon className="h-8 w-8 text-sky-700" />
                    <p className="mt-4 text-xl font-bold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="bg-slate-950 py-14 text-white">
          <div className="mx-auto max-w-5xl px-5 text-center sm:px-8 lg:px-10">
            <Badge className="mb-5 bg-white text-slate-950 hover:bg-white">Conclusion</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Le meilleur équilibre entre rentabilité et occupation</h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              L’objectif de Hello Keys est simple : obtenir le meilleur équilibre entre rentabilité et occupation afin de maximiser les revenus de votre logement, sans que vous ayez à suivre quotidiennement les évolutions du marché.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-sky-50">
                <Link to="/modules">Découvrir le module Smart Pricing</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Accéder à mon espace</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SmartPricingPage;
