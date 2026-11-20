import {
  BadgeCheck,
  Banknote,
  BellRing,
  CalendarDays,
  Camera,
  Clock3,
  Code2,
  GitBranch,
  Globe,
  Lock,
  RefreshCw,
  Server,
  Star,
} from "lucide-react";
import { Chip, Glow, IconBadge, Panel, Reveal, SlideFrame, SlideHeader } from "./kit";
import type { KeynoteSlide } from "./types";
import { cn } from "@/lib/utils";

const INVESTMENT_FOOTNOTE =
  "Chiffres mesurés au 20/11/2026. \"Valeur équivalente\" : estimation du coût d’un développement logiciel équivalent (équipe senior, marché français).";

function InvestmentFootnote() {
  return (
    <p className="absolute inset-x-20 bottom-6 text-[12px] leading-snug text-neutral-400">
      {INVESTMENT_FOOTNOTE}
    </p>
  );
}

function InvestmentIntroSlide() {
  return (
    <SlideFrame className="items-center justify-center bg-white px-20 text-center">
      <Glow className="left-1/2 top-1/2 h-[560px] w-[920px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-hk-600">
          Hello Keys · Pour vous
        </p>
      </Reveal>
      <Reveal delay={220}>
        <h2 className="mt-6 text-balance text-[68px] font-semibold leading-[1.02] tracking-[-0.055em] text-neutral-950">
          Hello Keys investit pour vous.
        </h2>
      </Reveal>
      <Reveal delay={480}>
        <p className="mx-auto mt-7 max-w-4xl text-balance text-[28px] font-medium leading-snug text-neutral-500">
          Du temps, de l’argent, de l’expertise — pour que vous sachiez tout, sans rien demander.
        </p>
      </Reveal>
      <Reveal delay={700}>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Chip className="px-4 py-2 text-sm">Du temps</Chip>
          <Chip className="px-4 py-2 text-sm">De l’argent</Chip>
          <Chip className="px-4 py-2 text-sm">De l’expertise</Chip>
        </div>
      </Reveal>
    </SlideFrame>
  );
}

const buildStats = [
  {
    icon: Code2,
    value: "~105 000",
    label: "lignes de code",
  },
  {
    icon: Server,
    value: "86",
    label: "modules serveur",
  },
  {
    icon: Globe,
    value: "5",
    label: "canaux certifiés",
    detail: "Airbnb, Booking, Vrbo, Expedia, Marriott",
  },
  {
    icon: GitBranch,
    value: "936",
    label: "versions livrées en 6 mois",
  },
  {
    icon: RefreshCw,
    value: "Quasi quotidiennes",
    label: "mises à jour",
    wide: true,
  },
];

function BuiltForYouSlide() {
  return (
    <SlideFrame className="pb-24">
      <Glow className="right-[-220px] top-[-160px] h-[520px] w-[720px]" />
      <SlideHeader kicker="Hello Keys investit pour vous" className="text-[46px]">
        Ce que nous avons construit pour vous.
      </SlideHeader>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {buildStats.map((stat, index) => (
          <Reveal key={stat.label} delay={350 + index * 140} className={cn(stat.wide && "col-span-2")}>
            <Panel className="flex h-[178px] flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-4">
                <p
                  className={cn(
                    "font-semibold leading-none tracking-[-0.055em] text-neutral-950",
                    stat.wide ? "text-[48px]" : "text-[58px]",
                  )}
                >
                  {stat.value}
                </p>
                <IconBadge icon={stat.icon} />
              </div>
              <div>
                <p className="text-xl font-semibold leading-tight text-neutral-900">{stat.label}</p>
                {stat.detail && <p className="mt-1 text-[16px] leading-snug text-neutral-500">{stat.detail}</p>}
              </div>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1050}>
        <p className="mt-7 text-center text-xl font-medium text-neutral-500">
          Un outil construit sur mesure, par une conciergerie, pour des propriétaires.
        </p>
      </Reveal>
      <InvestmentFootnote />
    </SlideFrame>
  );
}

const investmentBlocks = [
  {
    icon: Banknote,
    label: "Argent",
    value: "Plus de 5 900 $",
    text: "investis en intelligence artificielle de pointe",
  },
  {
    icon: Clock3,
    label: "Temps",
    value: "~160 heures",
    text: "d’ingénierie, 40 jours de construction intensive sur 6 mois",
  },
  {
    icon: BadgeCheck,
    label: "Exigence",
    value: "Conditions réelles",
    text: "chaque fonctionnalité testée avec les vraies plateformes",
  },
];

function InvestmentSlide() {
  return (
    <SlideFrame className="bg-white pb-24">
      <Glow className="left-[-220px] top-[160px] h-[520px] w-[700px]" />
      <SlideHeader kicker="L’investissement" className="text-[50px]">
        Nous avons mis les moyens.
      </SlideHeader>
      <div className="mt-9 grid grid-cols-3 gap-5">
        {investmentBlocks.map((block, index) => (
          <Reveal key={block.label} delay={400 + index * 180}>
            <Panel className="flex h-[250px] flex-col p-6">
              <div className="flex items-center gap-3">
                <IconBadge icon={block.icon} />
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">{block.label}</p>
              </div>
              <p
                className={cn(
                  "mt-auto font-semibold leading-none tracking-[-0.045em] text-neutral-950",
                  block.value.length > 12 ? "text-[38px]" : "text-[50px]",
                )}
              >
                {block.value}
              </p>
              <p className="mt-4 text-[18px] leading-snug text-neutral-500">{block.text}</p>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal delay={950}>
        <Panel className="mt-8 border-hk-500/25 bg-hk-50 p-6 text-center">
          <p className="text-[24px] font-semibold leading-snug text-neutral-950">
            Construire l’équivalent en développement classique : 250 000 – 400 000 € (estimation).
          </p>
        </Panel>
      </Reveal>
      <InvestmentFootnote />
    </SlideFrame>
  );
}

const ownerBenefits = [
  {
    icon: CalendarDays,
    text: "Vos réservations en direct, sans nous appeler",
    status: "available" as const,
  },
  {
    icon: BellRing,
    text: "Notification à chaque réservation, modification ou annulation",
    status: "available" as const,
  },
  {
    icon: Banknote,
    text: "Vos revenus reversés automatiquement à J+1 du départ",
    status: "available" as const,
  },
  {
    icon: Camera,
    text: "Chaque ménage prouvé par photos avant/après",
    status: "connect" as const,
  },
  {
    icon: Star,
    text: "Tous les avis voyageurs de vos logements, en intégralité",
    status: "connect" as const,
  },
  {
    icon: Lock,
    text: "Vos dates personnelles bloquées par vous, en autonomie",
    status: "connect" as const,
  },
];

function OwnerBenefitsSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-220px] top-[120px] h-[520px] w-[700px]" />
      <SlideHeader kicker="Pour vous, concrètement" className="text-[44px]">
        Ce que cet investissement rend possible.
      </SlideHeader>
      <div className="mt-9 grid grid-cols-3 gap-4">
        {ownerBenefits.map((benefit, index) => (
          <Reveal key={benefit.text} delay={350 + index * 130}>
            <Panel className="flex h-[168px] flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={benefit.icon} />
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-semibold",
                    benefit.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700",
                  )}
                >
                  {benefit.status === "available" ? "Disponible" : "À connecter"}
                </span>
              </div>
              <p className="text-[21px] font-semibold leading-snug tracking-[-0.02em] text-neutral-900">
                {benefit.text}
              </p>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1100}>
        <p className="mt-7 text-center text-[22px] font-medium text-neutral-500">
          Le retour sur investissement, c’est le vôtre.
        </p>
      </Reveal>
    </SlideFrame>
  );
}

function InvestmentClosingSlide() {
  return (
    <SlideFrame className="bg-white px-20 pb-16 text-center">
      <Glow className="left-1/2 top-[120px] h-[420px] w-[820px] -translate-x-1/2" />
      <div className="pt-8">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-hk-600">Clôture</p>
        </Reveal>
        <Reveal delay={220}>
          <h2 className="mt-5 text-[52px] font-semibold tracking-[-0.05em] text-neutral-950">
            Et nous ne nous arrêtons pas là.
          </h2>
        </Reveal>
        <Reveal delay={480}>
          <p className="mx-auto mt-6 max-w-4xl text-balance text-[26px] font-medium leading-snug text-neutral-500">
            L’investissement continue : chaque semaine, l’outil gagne en capacités. Vous ne payez pas la technologie.
            Vous en récoltez les fruits.
          </p>
        </Reveal>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Reveal delay={850}>
          <p className="text-balance text-[56px] font-semibold leading-[1.05] tracking-[-0.05em] text-neutral-950">
            Bienvenue dans votre espace propriétaire.
          </p>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

export const investmentSlides: KeynoteSlide[] = [
  {
    id: "investissement-ouverture",
    label: "Investissement · Ouverture",
    Component: InvestmentIntroSlide,
    mobile: {
      kicker: "Hello Keys · Pour vous",
      title: "Hello Keys investit pour vous.",
      lead: "Du temps, de l’argent, de l’expertise — pour que vous sachiez tout, sans rien demander.",
      chips: ["Du temps", "De l’argent", "De l’expertise"],
      align: "center",
    },
    notes: [
      "Nous avons fait un choix simple : construire l’outil que nous aurions voulu vous donner en tant que propriétaires.",
      "Cette section n’est pas là pour expliquer une recette. Elle est là pour montrer l’engagement de Hello Keys : du temps, de l’argent et de l’expertise, investis pour vous donner plus de visibilité et plus d’autonomie.",
      "Le message à faire sentir est chaleureux : cet outil existe parce que vos questions méritaient de vraies réponses.",
    ],
    transition: "Voici ce que nous avons construit pour vous.",
  },
  {
    id: "investissement-construction",
    label: "Investissement · Construction",
    Component: BuiltForYouSlide,
    mobile: {
      kicker: "Hello Keys investit pour vous",
      title: "Ce que nous avons construit pour vous.",
      bullets: [
        "~105 000 lignes de code",
        "86 modules serveur",
        "5 canaux certifiés : Airbnb, Booking, Vrbo, Expedia, Marriott",
        "936 versions livrées en 6 mois",
        "Mises à jour quasi quotidiennes",
      ],
      footnote: "Un outil construit sur mesure, par une conciergerie, pour des propriétaires.",
    },
    notes: [
      "Ce n’est pas un logiciel acheté sur étagère. C’est un outil construit sur mesure, par une conciergerie, pour des propriétaires. Et il grandit chaque semaine.",
      "L’objectif n’est pas d’impressionner avec la technique. L’objectif est de montrer que Hello Keys a construit une base durable, pensée pour répondre à vos besoins réels.",
    ],
    transition: "Cette construction représente un investissement réel.",
  },
  {
    id: "investissement-moyens",
    label: "Investissement · Moyens",
    Component: InvestmentSlide,
    mobile: {
      kicker: "L’investissement",
      title: "Nous avons mis les moyens.",
      bullets: [
        "Plus de 5 900 $ investis en intelligence artificielle de pointe",
        "~160 heures d’ingénierie sur 6 mois",
        "Chaque fonctionnalité testée avec les vraies plateformes",
      ],
      footnote: "Équivalent en développement classique : 250 000 – 400 000 € (estimation).",
    },
    notes: [
      "Nous aurions pu acheter un logiciel existant. Nous avons choisi d’investir pour en construire un meilleur — parce que vos questions de propriétaires méritaient des réponses qu’aucun logiciel du marché ne donne.",
      "Si la question vient sur la méthode, la réponse est simple : une équipe d’experts augmentée par les meilleures IA du marché. Point.",
      "Ce qui compte ici, c’est l’engagement : des moyens réels, concentrés sur un outil utile à vos logements.",
    ],
    transition: "Voici ce que cet investissement change dans votre quotidien.",
  },
  {
    id: "investissement-benefices",
    label: "Investissement · Bénéfices",
    Component: OwnerBenefitsSlide,
    mobile: {
      kicker: "Pour vous, concrètement",
      title: "Ce que cet investissement rend possible.",
      bullets: [
        "Disponible : réservations en direct, sans nous appeler",
        "Disponible : alertes à chaque réservation ou annulation",
        "Disponible : revenus reversés à J+1 du départ",
        "À connecter : ménage prouvé par photos, avis, dates personnelles",
      ],
      footnote: "Le retour sur investissement, c’est le vôtre.",
    },
    notes: [
      "Chaque euro et chaque heure investis tiennent dans cette liste. C’est ça, le retour sur investissement : le vôtre.",
      "Aujourd’hui, vous voyez déjà vos réservations, vos alertes et vos reversements. Les autres blocs — ménage, avis et dates personnelles — sont priorisés pour la connexion à votre espace.",
      "C’est là que l’investissement devient concret : il rend ces capacités possibles, puis les amène vers vous.",
    ],
    transition: "Et ce n’est pas fini.",
  },
  {
    id: "investissement-cloture",
    label: "Investissement · Clôture",
    Component: InvestmentClosingSlide,
    mobile: {
      kicker: "Clôture",
      title: "Et nous ne nous arrêtons pas là.",
      lead: "Chaque semaine, l’outil gagne en capacités. Vous ne payez pas la technologie : vous en récoltez les fruits.",
      chips: ["Bienvenue dans votre espace propriétaire"],
      align: "center",
    },
    notes: [
      "Terminer sur l’invitation : distribution ou envoi des accès juste après la présentation.",
      "Le ton doit rester simple : Hello Keys continue d’investir, et vous bénéficiez directement de chaque amélioration.",
    ],
    transition: "Revenons maintenant à ce que vous voyez dans votre espace propriétaire.",
  },
];
