import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, CloudRain, CloudSun, Info, MapPin, ShieldCheck, Sun, Thermometer, TrendingUp, Wind } from "lucide-react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const weatherCriteria = [
  { icon: Sun, title: "Ensoleillement", description: "La place du soleil dans les prévisions." },
  { icon: Thermometer, title: "Confort thermique", description: "Des températures favorables au séjour." },
  { icon: CloudRain, title: "Précipitations", description: "Les conditions de pluie annoncées." },
  { icon: Wind, title: "Vent", description: "L’intensité du vent prévue sur place." },
];

const safeguards = [
  { title: "Un plafond, pas une hausse imposée", text: "La hausse respecte le plafond configuré pour le logement. Ce plafond est une limite : il ne signifie pas que le prix augmente systématiquement de ce montant." },
  { title: "Pas de primes cumulées", text: "Les primes météo déjà reconnues ne sont pas cumulées lors des analyses suivantes. Le même signal météo ne donne pas lieu à des hausses répétées qui s’additionnent." },
  { title: "Pas de baisse météo automatique", text: "Lorsque la météo se dégrade, ce système ne baisse pas automatiquement vos prix. Les recommandations restent encadrées par la stratégie tarifaire du logement." },
  { title: "Les dates indisponibles restent à l’écart", text: "Les nouvelles hausses concernent uniquement les trois prochaines nuits disponibles. Les nuits déjà réservées ou bloquées sont exclues." },
];

export default function WeatherPricingNewsPage() {
  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl py-2">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Retour à l’accueil</Link>
        </Button>
        <article className="overflow-hidden rounded-3xl border bg-[#fafaf7] text-slate-900 shadow-sm">
          <section className="relative overflow-hidden border-b border-teal-100 bg-gradient-to-br from-teal-50 via-white to-amber-50">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 sm:py-12 xl:grid-cols-[1.4fr_0.8fr] xl:items-center">
              <div>
                <Badge className="mb-6 border-teal-200 bg-teal-100 text-teal-900 hover:bg-teal-100">Nouveauté · Tarification dynamique</Badge>
                <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">La météo, un nouvel éclairage sur vos tarifs</h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">La tarification dynamique est déjà utilisée sur notre parc de logements. Hello Keys développe un croisement avec les prévisions météo pour vous aider à ajuster les tarifs des prochaines nuits disponibles, dans un cadre maîtrisé. Cette fonctionnalité est une aide à la décision, sans garantie de réservations ou de revenus supplémentaires.</p>
                <Button asChild className="mt-7 bg-teal-800 hover:bg-teal-900"><a href="#fonctionnement">Découvrir le fonctionnement<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
              </div>
              <Card className="rounded-3xl border-white bg-white/90 shadow-xl shadow-teal-900/5">
                <CardContent className="p-7 sm:p-9">
                  <div className="mb-6 flex items-center justify-between"><CloudSun className="h-16 w-16 text-amber-500" strokeWidth={1.5} /><Badge variant="outline" className="border-teal-200 text-teal-800">Un signal complémentaire</Badge></div>
                  <p className="text-2xl font-semibold tracking-tight">Des recommandations ciblées, pas des hausses systématiques.</p>
                  <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
                    <p className="flex items-center gap-3 text-sm text-slate-600"><MapPin className="h-5 w-5 shrink-0 text-teal-700" />La météo à la localisation de votre logement</p>
                    <p className="flex items-center gap-3 text-sm text-slate-600"><CalendarDays className="h-5 w-5 shrink-0 text-teal-700" />Les 3 prochaines nuits disponibles</p>
                    <p className="flex items-center gap-3 text-sm text-slate-600"><Clock3 className="h-5 w-5 shrink-0 text-teal-700" />Une analyse prévue toutes les 6 heures</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <section className="grid gap-6 border-b border-slate-200 py-14 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
              <div><p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">L’opportunité</p><h2 className="text-3xl font-semibold tracking-tight">Pourquoi regarder aussi la météo ?</h2></div>
              <div className="space-y-4 text-base leading-8 text-slate-600">
                <p>Un temps agréable peut rendre un séjour plus attractif, notamment à l’approche de la date d’arrivée. Croiser ce signal avec la tarification dynamique permet d’identifier une éventuelle opportunité sur les nuits encore disponibles de votre logement.</p>
                <p>Un beau temps favorable peut déclencher une <strong className="font-semibold text-slate-900">hausse progressive, même s’il était déjà prévu</strong>. Il n’est donc pas nécessaire qu’une éclaircie inattendue apparaisse : la qualité des conditions, la fiabilité des prévisions et la proximité de la nuit comptent ensemble.</p>
              </div>
            </section>

            <section id="fonctionnement" className="scroll-mt-8 py-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">Le fonctionnement</p>
              <h2 className="text-3xl font-semibold tracking-tight">Comment les prix peuvent être ajustés</h2>
              <p className="mt-4 max-w-3xl leading-8 text-slate-600">Le moteur analyse les prévisions à la localisation du logement. Il ne se limite pas à la présence de soleil : il prend en compte quatre critères pour apprécier les conditions du séjour.</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {weatherCriteria.map(({ icon: Icon, title, description }) => (
                  <Card key={title} className="rounded-2xl border-slate-200 shadow-none"><CardContent className="p-6"><Icon className="mb-5 h-7 w-7 text-teal-700" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></CardContent></Card>
                ))}
              </div>
              <div className="mt-8 grid gap-6 rounded-3xl bg-teal-950 p-7 text-white sm:p-9 md:grid-cols-2">
                <div><TrendingUp className="mb-4 h-6 w-6 text-teal-300" /><h3 className="text-xl font-semibold">Une prime proportionnée au contexte</h3><p className="mt-3 leading-7 text-teal-50/85">La prime dépend de la qualité météo, de la fiabilité des prévisions et de la proximité de la nuit. Elle peut conduire à une hausse progressive ou au maintien du prix de référence.</p></div>
                <div><Clock3 className="mb-4 h-6 w-6 text-teal-300" /><h3 className="text-xl font-semibold">Un suivi régulier des nuits disponibles</h3><p className="mt-3 leading-7 text-teal-50/85">Les analyses automatiques sont prévues toutes les six heures. Les nouvelles hausses ne portent que sur les trois prochaines nuits disponibles, en excluant les nuits réservées ou bloquées.</p></div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-14">
              <div className="mb-7 flex items-start gap-4"><ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-teal-700" /><div><p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">Les garde-fous</p><h2 className="text-3xl font-semibold tracking-tight">Des recommandations encadrées</h2></div></div>
              <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
                {safeguards.map((item) => (<div key={item.title} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-teal-700" /><div><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-2 leading-7 text-slate-600">{item.text}</p></div></div>))}
              </div>
              <aside className="mt-9 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-950">Avec Beyond : recommandation et envoi sont distincts</h3>
                <p className="mt-3 leading-7 text-slate-700">Pour les logements reliés à Beyond, les recommandations peuvent être envoyées après confirmation manuelle, ou automatiquement si ce mode a été explicitement activé. <strong>Une recommandation n’est pas un tarif publié :</strong> la confirmation d’envoi est indiquée séparément.</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Les modalités d’utilisation et les paramètres du logement sont à voir avec votre gestionnaire. Ces commandes de configuration ne sont pas nécessairement accessibles à chaque propriétaire.</p>
              </aside>
            </section>

            <section id="en-savoir-plus" className="scroll-mt-8 border-t border-slate-200 py-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">La transparence</p>
              <h2 className="text-3xl font-semibold tracking-tight">Comprendre chaque prix en un clic</h2>
              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div className="space-y-4 leading-8 text-slate-600">
                  <p>Dans le calendrier, cliquez sur <strong className="text-slate-900">« En savoir plus »</strong> sur une date pour comprendre la recommandation associée à cette nuit.</p>
                  <p>Vous pouvez consulter le prix de référence, le tarif recommandé, les critères météo et les raisons de la hausse ou du maintien du prix. Vous disposez ainsi des éléments pour en discuter avec votre gestionnaire, sans devoir interpréter seul un changement de tarif.</p>
                  <p className="flex gap-3 rounded-2xl bg-slate-100 p-4 text-sm leading-6"><Info className="mt-0.5 h-5 w-5 shrink-0" /><span>Lorsque le détail d’une ancienne analyse n’est pas disponible, cette limite est clairement indiquée. Un ancien tarif ne s’accompagne donc pas toujours du détail de son analyse.</span></p>
                </div>
                <Card className="rounded-3xl border-teal-100 bg-white shadow-none"><CardContent className="p-7">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><CalendarDays className="h-6 w-6 text-teal-700" /><h3 className="font-semibold">Ce que le détail vous permet de lire</h3></div>
                  <dl className="space-y-5 pt-5">
                    <div><dt className="font-semibold">Prix de référence → tarif recommandé</dt><dd className="mt-1 text-sm leading-6 text-slate-600">Le point de départ et la proposition pour la nuit.</dd></div>
                    <div><dt className="font-semibold">Critères météo et explications</dt><dd className="mt-1 text-sm leading-6 text-slate-600">Les conditions prises en compte et les raisons de la hausse ou du maintien.</dd></div>
                    <div><dt className="font-semibold">Confirmation d’envoi, séparément</dt><dd className="mt-1 text-sm leading-6 text-slate-600">Une information distincte de la recommandation pour les envois vers Beyond.</dd></div>
                  </dl>
                  <p className="mt-6 text-xs leading-5 text-slate-500">Présentation explicative : aucun prix réel ni statut d’envoi de votre logement n’est affiché sur cette page.</p>
                </CardContent></Card>
              </div>
            </section>

            <section className="mb-14 rounded-3xl border border-teal-100 bg-teal-50 p-8 text-center sm:p-12">
              <CloudSun className="mx-auto mb-5 h-10 w-10 text-teal-700" />
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Un signal de plus, une décision éclairée</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-600">La météo complète la tarification dynamique, sans remplacer la stratégie de votre logement. Échangez avec votre gestionnaire sur l’utilisation de cette fonctionnalité, ses limites et les modalités d’envoi adaptées à votre logement.</p>
            </section>
          </div>
        </article>
      </div>
    </MainLayout>
  );
}
