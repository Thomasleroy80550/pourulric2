import {
  Check,
  Code2,
  Database,
  KeyRound,
  LayoutGrid,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { BigFigure, Chip, Glow, IconBadge, Panel, Reveal, SlideFrame, SlideHeader } from "./kit";
import type { KeynoteSlide } from "./types";
import { cn } from "@/lib/utils";

const FOOTNOTE =
  "Estimations en fourchettes — TJM senior France 700 €/j. Métriques de code auditées à la date de présentation. Facteur d’accélération IA (~3×) : moyenne constatée sur ce type de développement assisté.";

function CostFootnote() {
  return (
    <p className="absolute inset-x-20 bottom-6 text-[12px] leading-snug text-neutral-400">
      {FOOTNOTE}
    </p>
  );
}

function CostIntroSlide() {
  return (
    <SlideFrame className="items-center justify-center bg-white px-20 pb-24 text-center">
      <Glow className="left-1/2 top-1/2 h-[560px] w-[920px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-hk-600">
          Le vrai coût de la plateforme
        </p>
      </Reveal>
      <Reveal delay={220}>
        <BigFigure value="105 000" caption="lignes de code" className="text-[168px]" />
      </Reveal>
      <Reveal delay={520}>
        <h2 className="mx-auto mt-8 max-w-5xl text-balance text-[42px] font-semibold leading-[1.08] tracking-[-0.045em] text-neutral-950">
          105 000 lignes de code. Vous, vous avez juste à vous connecter.
        </h2>
      </Reveal>
      <Reveal delay={700}>
        <p className="mt-4 text-[24px] font-medium leading-snug text-neutral-500">
          Ce que représente réellement cette plateforme — en temps et en argent.
        </p>
      </Reveal>
      <CostFootnote />
    </SlideFrame>
  );
}

const assetStats = [
  {
    icon: Code2,
    value: "105 000",
    label: "lignes de code",
    detail: "323 fichiers React/TypeScript",
  },
  {
    icon: LayoutGrid,
    value: "173",
    label: "composants d’interface",
    detail: "53 pages métier + site de réservation public",
  },
  {
    icon: Server,
    value: "86",
    label: "fonctions serverless",
    detail: "17 modules partagés",
  },
  {
    icon: Database,
    value: "73",
    label: "tables de base de données",
    detail: "toutes sécurisées (RLS)",
  },
  {
    icon: KeyRound,
    value: "21",
    label: "intégrations par clés secrètes",
    detail: "NextPax, Stripe, Beyond, Resend, Netatmo…",
  },
  {
    icon: Zap,
    value: "100+",
    label: "commits en 3 jours",
    detail: "livraisons quotidiennes en production",
  },
];

function AssetFiguresSlide() {
  return (
    <SlideFrame className="pb-24">
      <Glow className="right-[-220px] top-[-160px] h-[520px] w-[720px]" />
      <SlideHeader kicker="Le vrai coût de la plateforme" className="text-[48px]">
        L’actif en chiffres.
      </SlideHeader>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {assetStats.map((stat, index) => (
          <Reveal key={stat.label} delay={350 + index * 120}>
            <Panel className="h-[176px] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[54px] font-semibold leading-none tracking-[-0.055em] text-neutral-950">
                  {stat.value}
                </p>
                <IconBadge icon={stat.icon} />
              </div>
              <p className="mt-4 text-xl font-semibold leading-tight text-neutral-900">{stat.label}</p>
              <p className="mt-1 text-sm leading-snug text-neutral-500">{stat.detail}</p>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1100}>
        <p className="mt-6 text-center text-lg font-medium text-neutral-500">
          Chaque nombre est mesuré sur le code, aujourd’hui.
        </p>
      </Reveal>
      <CostFootnote />
    </SlideFrame>
  );
}

const costRows = [
  {
    chantier: "Channel manager certifié",
    detail: "5 canaux : Airbnb, Booking, Vrbo, Expedia, Marriott",
    days: "150 – 230 j",
    cost: "105 – 161 k€",
  },
  {
    chantier: "Paiements",
    detail: "cautions, Stripe Connect, reversements propriétaires J+1",
    days: "40 – 60 j",
    cost: "28 – 42 k€",
  },
  {
    chantier: "Portail propriétaire",
    detail: "API privée, webhooks signés, temps réel",
    days: "25 – 40 j",
    cost: "17 – 28 k€",
  },
  {
    chantier: "Tarification",
    detail: "Beyond + moteur météo propriétaire",
    days: "30 – 50 j",
    cost: "21 – 35 k€",
  },
  {
    chantier: "Opérations terrain",
    detail: "ménage, photos avant/après, blanchisserie",
    days: "35 – 55 j",
    cost: "24 – 38 k€",
  },
  {
    chantier: "Distribution directe",
    detail: "moteur + site public de réservation",
    days: "30 – 45 j",
    cost: "21 – 31 k€",
  },
  {
    chantier: "Pilotage",
    detail: "statistiques, exports, alertes, diagnostic",
    days: "25 – 40 j",
    cost: "17 – 28 k€",
  },
  {
    chantier: "Fondations",
    detail: "auth, multi-agences, sécurité, imports",
    days: "30 – 45 j",
    cost: "21 – 31 k€",
  },
];

function WithoutAiCostSlide() {
  return (
    <SlideFrame className="pb-24">
      <SlideHeader kicker="Le vrai coût de la plateforme" className="text-[44px]">
        Le chiffrage sans IA.
      </SlideHeader>
      <Reveal delay={300}>
        <p className="mt-4 text-[17px] font-medium text-neutral-500">
          Hypothèse affichée : TJM senior full-stack France 700 €/j, certifications partenaires incluses.
        </p>
      </Reveal>
      <Reveal delay={450}>
        <Panel className="mt-5 overflow-hidden rounded-[24px]">
          <table className="w-full border-collapse text-left text-[16px]">
            <thead>
              <tr className="bg-[#f5f5f7] text-neutral-500">
                <th className="px-5 py-3 font-semibold">Chantier</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Jours-homme</th>
                <th className="w-[135px] px-4 py-3 text-right font-semibold">Coût</th>
              </tr>
            </thead>
            <tbody>
              {costRows.map((row) => (
                <tr key={row.chantier} className="border-t border-black/[0.05]">
                  <td className="px-5 py-2">
                    <span className="font-semibold text-neutral-900">{row.chantier}</span>{" "}
                    <span className="leading-snug text-neutral-500">({row.detail})</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-700">{row.days}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-neutral-900">{row.cost}</td>
                </tr>
              ))}
              <tr className="border-t border-hk-500/20 bg-hk-50">
                <td className="px-5 py-3 font-semibold text-neutral-950">TOTAL</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-neutral-950">365 – 565 j-h</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-950">255 – 395 k€</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </Reveal>
      <Reveal delay={650}>
        <div className="mt-4 flex items-center justify-between gap-4 text-[15px] leading-snug">
          <Chip className="max-w-[760px] px-4 py-2 text-[15px]">
            Équivalent : 1,7 à 2,6 années-homme → une équipe de 2 à 3 développeurs pendant 8 à 14 mois.
          </Chip>
          <Chip className="px-4 py-2 text-[15px]">Maintenance : +50 à 80 k€/an.</Chip>
        </div>
      </Reveal>
      <CostFootnote />
    </SlideFrame>
  );
}

const realityColumns = [
  {
    icon: Server,
    label: "SANS IA",
    items: ["365–565 jours-homme", "8–14 mois", "255–395 k€"],
  },
  {
    icon: Sparkles,
    label: "AVEC IA",
    subtitle: "(réalité)",
    items: ["~3× plus rapide", "équipe ultra-réduite", "coût marginal de l’IA : quelques dizaines d’euros/mois"],
    featured: true,
  },
  {
    icon: Zap,
    label: "LA PREUVE",
    items: ["100+ commits en 3 jours", "plusieurs livraisons par jour"],
  },
];

const humanExpertise = [
  "Les décisions produit et métier",
  "Les certifications partenaires (sandbox/production)",
  "Le debug en conditions réelles avec les OTA",
  "L’architecture de sécurité : paiements idempotents, chiffrement, RLS",
];

function AiRealitySlide() {
  return (
    <SlideFrame className="bg-white pb-24">
      <Glow className="left-[-220px] top-[120px] h-[520px] w-[700px]" />
      <SlideHeader kicker="La réalité" className="text-[48px]">
        L’IA a compressé le temps. Pas l’expertise.
      </SlideHeader>
      <div className="mt-7 grid grid-cols-3 gap-4">
        {realityColumns.map((column, index) => (
          <Reveal key={column.label} delay={400 + index * 180}>
            <Panel className={cn("h-[205px] p-5", column.featured && "border-hk-500/25 bg-hk-50")}>
              <div className="flex items-center gap-3">
                <IconBadge icon={column.icon} muted={!column.featured} />
                <div>
                  <p className={cn("text-sm font-semibold uppercase tracking-[0.2em]", column.featured ? "text-hk-700" : "text-neutral-500")}>
                    {column.label}
                  </p>
                  {column.subtitle && <p className="text-sm font-medium text-hk-700">{column.subtitle}</p>}
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {column.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[18px] font-medium leading-snug text-neutral-800">
                    <span className={cn("mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full", column.featured ? "bg-hk-500" : "bg-neutral-300")} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal delay={950}>
        <Panel className="mt-5 p-5">
          <div className="flex items-center gap-3">
            <IconBadge icon={ShieldCheck} />
            <p className="text-xl font-semibold text-neutral-950">Ce que l’IA n’a pas remplacé</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {humanExpertise.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-hk-600" aria-hidden />
                <p className="text-[16px] leading-snug text-neutral-700">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Reveal>
      <CostFootnote />
    </SlideFrame>
  );
}

function CostClosingSlide() {
  return (
    <SlideFrame className="pb-24">
      <Glow className="left-1/2 top-[-180px] h-[500px] w-[900px] -translate-x-1/2" />
      <SlideHeader kicker="Le vrai coût de la plateforme" className="text-[48px]">
        Ce que vous retenez.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-2 gap-6">
        <Reveal delay={400}>
          <Panel className="flex h-full flex-col p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-hk-600">Variante client</p>
            <p className="mt-7 text-[27px] font-semibold leading-[1.22] tracking-[-0.025em] text-neutral-950">
              Construire l’équivalent : 255 à 395 k€, 8 à 14 mois, puis 50 à 80 k€ par an.
            </p>
            <p className="mt-5 text-[24px] font-medium leading-snug text-neutral-600">
              Vous, vous vous connectez. Et pendant que vous dormez, la plateforme gagne des fonctionnalités.
            </p>
          </Panel>
        </Reveal>
        <Reveal delay={650}>
          <Panel className="flex h-full flex-col border-hk-500/25 bg-hk-50 p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-hk-700">
              Variante partenaire / investisseur
            </p>
            <p className="mt-7 text-[24px] font-semibold leading-[1.28] tracking-[-0.02em] text-neutral-950">
              L’actif : 105 000 lignes, 86 fonctions, 73 tables, 5 canaux certifiés, paiements en production.
            </p>
            <p className="mt-5 text-[22px] font-medium leading-snug text-neutral-600">
              La méthode : équipe réduite augmentée par l’IA — coût de construction 3 à 4 fois inférieur, vélocité prouvée par 100 commits en 3 jours.
            </p>
          </Panel>
        </Reveal>
      </div>
      <Reveal delay={900}>
        <p className="mt-6 text-center text-sm font-medium uppercase tracking-[0.22em] text-neutral-400">
          L’orateur choisit la variante selon le public.
        </p>
      </Reveal>
      <CostFootnote />
    </SlideFrame>
  );
}

export const costSlides: KeynoteSlide[] = [
  {
    id: "cout-ouverture",
    label: "Coût · Ouverture",
    Component: CostIntroSlide,
    notes: [
      "Avant de parler de ce que vous voyez dans votre espace, parlons de ce qui le fait exister. Cette plateforme représente un actif logiciel mesurable, construit par Hello Keys.",
      "Le sujet n’est pas la technique pour la technique. C’est le temps et l’argent que vous n’avez pas eu à investir.",
      "Vous allez voir ce que représente réellement cette plateforme, puis ce que cela change pour vous.",
    ],
    transition: "Commençons par la taille réelle de l’actif.",
  },
  {
    id: "cout-actif",
    label: "Coût · L’actif en chiffres",
    Component: AssetFiguresSlide,
    notes: [
      "Ces chiffres ne sont pas des estimations marketing : c’est l’audit du code, aujourd’hui. Chaque nombre est mesuré.",
      "Ce que vous voyez ici, c’est la base qui permet les promotions, les photos, les messages, les réservations, les ménages, les avis et les reversements.",
      "Ce n’est pas un prototype. C’est une plateforme en production, enrichie en continu.",
    ],
    transition: "Que faudrait-il pour construire l’équivalent sans l’assistance IA ?",
  },
  {
    id: "cout-sans-ia",
    label: "Coût · Sans IA",
    Component: WithoutAiCostSlide,
    notes: [
      "Construire seul l’équivalent, c’est un quart à un demi-million d’euros et plus d’un an — pendant que le marché avance sans vous.",
      "Chaque ligne du tableau correspond à un chantier métier complet : distribution, paiements, portail propriétaire, tarification, opérations terrain, réservation directe, pilotage et fondations.",
      "Et ce chiffrage ne concerne que la construction. La maintenance continue ensuite.",
    ],
    transition: "La réalité a été différente. Et nous l’assumons clairement.",
  },
  {
    id: "cout-avec-ia",
    label: "Coût · Avec IA",
    Component: AiRealitySlide,
    notes: [
      "Nous le revendiquons : l’IA est notre accélérateur. Chaque euro investi produit 3 à 4 euros d’actif logiciel équivalent. Mais les allers-retours de certification, les règles métier, la sécurité bancaire : ça, c’est du savoir-faire.",
      "L’IA a compressé le temps. Elle n’a pas remplacé les décisions produit, la connaissance métier, les certifications partenaires ni le travail de sécurité.",
      "C’est cette combinaison qui explique la vélocité de Cadence.",
    ],
    transition: "Il reste à choisir la conclusion selon le public.",
  },
  {
    id: "cout-cloture",
    label: "Coût · Clôture",
    Component: CostClosingSlide,
    notes: [
      "Variante client : Construire l’équivalent : 255 à 395 k€, 8 à 14 mois, puis 50 à 80 k€ par an. Vous, vous vous connectez. Et pendant que vous dormez, la plateforme gagne des fonctionnalités.",
      "Variante partenaire / investisseur : L’actif : 105 000 lignes, 86 fonctions, 73 tables, 5 canaux certifiés, paiements en production. La méthode : équipe réduite augmentée par l’IA — coût de construction 3 à 4 fois inférieur, vélocité prouvée par 100 commits en 3 jours.",
      "Choisissez la variante adaptée à la salle, puis revenez à ce que le propriétaire voit concrètement dans son espace.",
    ],
    transition: "Revenons maintenant à ce que cette plateforme vous donne concrètement.",
  },
];
