import type { ComponentType } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  CloudSun,
  Database,
  FileText,
  Gauge,
  Globe,
  Image as ImageIcon,
  Images,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Star,
  Ticket,
  Upload,
} from "lucide-react";
import {
  BigFigure,
  Bullets,
  Chip,
  Glow,
  IconBadge,
  Panel,
  Reveal,
  SlideFrame,
  SlideHeader,
  TechNote,
  Wordmark,
} from "./kit";
import { cn } from "@/lib/utils";

export interface KeynoteCheatSheetRow {
  capacity: string;
  source: string;
  say: string;
}

export interface KeynoteSlide {
  id: string;
  label: string;
  Component: ComponentType;
  notes: string[];
  transition: string;
  cheatSheet?: KeynoteCheatSheetRow[];
}

const channelPromotions = [
  { name: "Booking.com", code: "BOO142" },
  { name: "Airbnb", code: "AIR298" },
  { name: "Expedia", code: "EXP270" },
  { name: "Vrbo", code: "HOM143" },
  { name: "Marriott", code: "MAR392" },
];

const photoTones = [
  "from-sky-400/50 to-blue-950/70",
  "from-cyan-300/40 to-slate-950/70",
  "from-indigo-400/40 to-blue-950/70",
  "from-teal-300/40 to-slate-950/70",
];

function FlowArrow({ label, delay = 0 }: { label?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="flex flex-col items-center gap-2 text-hk-300">
      <ArrowRight className="h-8 w-8" aria-hidden />
      {label && <span className="font-mono text-[11px] uppercase tracking-[0.18em]">{label}</span>}
    </Reveal>
  );
}

function OpeningSlide() {
  return (
    <SlideFrame className="items-center justify-center px-24 text-center">
      <Glow className="left-1/2 top-1/2 h-[560px] w-[920px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute inset-x-0 top-12 flex justify-center">
        <Reveal>
          <Wordmark />
        </Reveal>
      </div>
      <Reveal delay={300}>
        <h1 className="max-w-5xl text-balance text-[76px] font-semibold leading-[1.05] tracking-tighter">
          Chaque jour,
          <br />
          <span className="bg-gradient-to-r from-white to-hk-300 bg-clip-text text-transparent">
            un peu plus autonome.
          </span>
        </h1>
      </Reveal>
    </SlideFrame>
  );
}

const frictions = [
  {
    icon: Ticket,
    question: "Une promotion ?",
    answer: "Un ticket au support. 48 heures d’attente.",
  },
  {
    icon: MousePointerClick,
    question: "Une mise en ligne ?",
    answer: "Les mêmes clics, plateforme après plateforme.",
  },
  {
    icon: PhoneCall,
    question: "Un propriétaire ?",
    answer: "Il appelle pour avoir des nouvelles.",
  },
  {
    icon: FileText,
    question: "Ses revenus ?",
    answer: "Un relevé, une fois par mois.",
  },
];

function ProblemSlide() {
  return (
    <SlideFrame>
      <SlideHeader kicker="Le problème" muted>
        Avant : vous dépendiez de tout le monde.
      </SlideHeader>
      <div className="mt-10 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_350px] gap-10">
        <div className="space-y-4">
          {frictions.map((item, index) => (
            <Reveal key={item.question} delay={450 + index * 180}>
              <Panel className="flex items-center gap-5 border-white/[0.08] bg-white/[0.03] p-5">
                <IconBadge icon={item.icon} muted />
                <div>
                  <p className="text-[24px] font-semibold leading-tight text-zinc-100">{item.question}</p>
                  <p className="mt-1 text-[20px] leading-snug text-zinc-500">{item.answer}</p>
                </div>
              </Panel>
            </Reveal>
          ))}
        </div>
        <Reveal delay={1050} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center border-white/[0.08] bg-white/[0.03] p-8 text-center">
            <BigFigure muted value="48 h" caption="d’attente pour une simple promotion" />
            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-zinc-600">Aucune couleur. Aucune prise.</p>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

const promiseMilestones = [
  { icon: Megaphone, label: "Promotions" },
  { icon: Images, label: "Photos" },
  { icon: MessageSquare, label: "Messages" },
];

function PromiseSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-180px] top-[-160px] h-[520px] w-[720px]" />
      <SlideHeader kicker="La promesse">Une plateforme vivante.</SlideHeader>
      <div className="mt-10 max-w-3xl">
        <Bullets
          items={[
            "Des fonctionnalités ajoutées en continu",
            "Chacune pensée pour votre autonomie",
            "Sans ticket. Sans attendre.",
            "Même un dimanche soir.",
          ]}
        />
      </div>
      <div className="relative mt-16">
        <div className="absolute left-[16%] right-[16%] top-11 h-px bg-gradient-to-r from-transparent via-hk-500/50 to-transparent" />
        <div className="grid grid-cols-3 gap-8">
          {promiseMilestones.map((milestone, index) => (
            <Reveal key={milestone.label} delay={650 + index * 220}>
              <Panel className="relative flex flex-col items-center px-6 py-7 text-center">
                <IconBadge icon={milestone.icon} />
                <p className="mt-4 text-xl font-semibold">{milestone.label}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

const promotionSteps = [
  { title: "La page Promotions", detail: "Le point de départ, dans Cadence." },
  { title: "Le canal", detail: "Cinq canaux, avec leurs vraies règles." },
  { title: "Le type d’offre", detail: "Dernière minute, early bird, dates de séjour…" },
  { title: "La remise", detail: "Vous validez. Cadence appelle NextPax." },
  { title: "En ligne", detail: "L’offre est propagée aux plateformes." },
];

function PromotionSlide() {
  return (
    <SlideFrame>
      <Glow className="left-[-220px] top-[220px] h-[520px] w-[640px]" />
      <SlideHeader kicker="Démonstration 1">Une promotion en moins de 5 minutes.</SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[520px_minmax(0,1fr)] gap-10">
        <div className="space-y-3">
          {promotionSteps.map((step, index) => (
            <Reveal key={step.title} delay={400 + index * 150}>
              <Panel className="flex items-center gap-4 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hk-500/20 text-lg font-semibold text-hk-300">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xl font-semibold leading-tight">{step.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">{step.detail}</p>
                </div>
              </Panel>
            </Reveal>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-5">
          <Reveal delay={850}>
            <Panel className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Canal</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {channelPromotions.map((channel) => (
                  <Chip key={channel.code}>
                    {channel.name}
                    <span className="ml-2 font-mono text-[11px] text-hk-300">{channel.code}</span>
                  </Chip>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Type d’offre</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip>Dernière minute · seuil en heures</Chip>
                <Chip>Early bird</Chip>
                <Chip>Dates de séjour</Chip>
              </div>
            </Panel>
          </Reveal>
          <div className="mt-auto flex items-end justify-between gap-6">
            <Reveal delay={1150}>
              <BigFigure value="< 5 min" caption="de la décision à la diffusion" />
            </Reveal>
            <Reveal delay={1350}>
              <div className="mb-2 flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-emerald-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </span>
                Active
              </div>
            </Reveal>
          </div>
          <Reveal delay={1450}>
            <TechNote>{"POST /promotions/{propertyManagerCode} · applicableChannels · PATCH status=active|inactive"}</TechNote>
          </Reveal>
        </div>
      </div>
    </SlideFrame>
  );
}

const photoLabels = ["Vue", "Chambre", "Salle de bain", "Cuisine"];

function PhotoTile({ index, label, principal }: { index: number; label: string; principal?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-3",
        principal ? "border-hk-300/60" : "border-white/10",
        photoTones[index % photoTones.length],
      )}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/35 text-sm font-semibold text-white">
          {index + 1}
        </span>
        {principal && <Chip className="border-hk-300/40 bg-black/35 px-2 py-1 text-[11px] text-hk-200">Principale</Chip>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="rounded-md bg-black/40 px-2 py-1 text-[12px] text-white/90">{label}</span>
        <ImageIcon className="h-4 w-4 text-white/50" aria-hidden />
      </div>
    </div>
  );
}

function PhotoGrid({ title, delay }: { title: string; delay: number }) {
  return (
    <Reveal delay={delay} className="w-[330px] shrink-0">
      <Panel className="p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
        <div className="grid grid-cols-2 gap-3">
          {photoLabels.map((label, index) => (
            <PhotoTile key={label} index={index} label={label} principal={index === 0} />
          ))}
        </div>
      </Panel>
    </Reveal>
  );
}

function PhotosSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-160px] top-[180px] h-[500px] w-[620px]" />
      <SlideHeader kicker="Démonstration 2" className="text-[44px]">
        La première photo, c’est vous qui la choisissez.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-8">
        <Bullets
          className="mt-3 text-[19px]"
          items={[
            "Glisser. Déposer. C’est ordonné.",
            "« Photo principale » en un clic",
            "Chaque photo étiquetée : chambre, salle de bain, vue…",
            "L’ordre dans Cadence = l’ordre sur les annonces",
            "Téléversement en masse · contrôle global · export CSV",
          ]}
        />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex items-center justify-center gap-5">
            <PhotoGrid title="Dans Cadence" delay={450} />
            <FlowArrow label="displayPriority" delay={850} />
            <PhotoGrid title="Sur l’annonce" delay={1050} />
          </div>
          <Reveal delay={1250}>
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-zinc-400">
              <Upload className="h-4 w-4 text-hk-300" aria-hidden />
              Téléversement en masse, miroir sécurisé des URLs, contrôle par logement.
            </div>
          </Reveal>
          <Reveal delay={1400}>
            <TechNote className="mt-2 text-center">displayPriority · Supply API · upsert images dédié · typeCode NextPax</TechNote>
          </Reveal>
        </div>
      </div>
    </SlideFrame>
  );
}

const inboxThreads = [
  { channel: "Airbnb", unread: 2, active: true },
  { channel: "Booking.com", unread: 0, active: false },
  { channel: "Expedia", unread: 1, active: false },
  { channel: "Vrbo", unread: 0, active: false },
];

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("h-2.5 rounded-full bg-white/10", className)} />;
}

function InboxMock() {
  return (
    <Reveal delay={500}>
      <Panel className="overflow-hidden">
        <div className="grid h-[300px] grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-r border-white/10 bg-white/[0.03] p-3">
            {inboxThreads.map((thread) => (
              <div
                key={thread.channel}
                className={cn(
                  "mb-2 rounded-xl border p-3",
                  thread.active ? "border-hk-300/30 bg-hk-500/10" : "border-transparent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-200">{thread.channel}</span>
                  {thread.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-hk-500 px-1.5 text-[11px] font-semibold text-white">
                      {thread.unread}
                    </span>
                  )}
                </div>
                <SkeletonBar className="mt-3 w-4/5" />
                <SkeletonBar className="mt-2 w-3/5" />
              </div>
            ))}
          </div>
          <div className="flex flex-col p-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <MessageSquare className="h-5 w-5 text-hk-300" aria-hidden />
              <div className="flex-1">
                <SkeletonBar className="w-40" />
                <SkeletonBar className="mt-2 w-24" />
              </div>
              <Chip>Historique complet</Chip>
            </div>
            <div className="flex-1 space-y-3 py-4">
              <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-white/[0.07] p-3">
                <SkeletonBar className="w-full" />
                <SkeletonBar className="mt-2 w-2/3" />
              </div>
              <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-hk-500/25 p-3">
                <SkeletonBar className="w-full bg-white/20" />
                <SkeletonBar className="mt-2 w-1/2 bg-white/20" />
              </div>
              <div className="max-w-[64%] rounded-2xl rounded-bl-sm bg-white/[0.07] p-3">
                <SkeletonBar className="w-5/6" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <SkeletonBar className="flex-1" />
              <span className="text-sm font-medium text-hk-300">Répondre</span>
            </div>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}

function MessagesSlide() {
  return (
    <SlideFrame>
      <Glow className="left-[420px] top-[-180px] h-[500px] w-[700px]" />
      <SlideHeader kicker="Démonstration 3" className="text-[44px]">
        Toutes vos conversations. Une seule boîte.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[410px_minmax(0,1fr)] gap-8">
        <Bullets
          className="mt-3 text-[19px]"
          items={[
            "Une boîte de réception unique, toutes plateformes confondues",
            "Dernier message, badge non lu, historique complet",
            "Vous répondez ici : la réponse part sur le bon canal",
            "Messages automatiques + notifications push",
            "Zéro réglage : Cadence se configure seule",
          ]}
        />
        <div className="flex min-w-0 flex-col justify-center">
          <InboxMock />
          <Reveal delay={950}>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Chip>Tous les IDs hôte Airbnb</Chip>
              <ArrowRight className="h-4 w-4 text-hk-300" aria-hidden />
              <Chip>Fusion automatique · 1 fois par jour</Chip>
              <ArrowRight className="h-4 w-4 text-hk-300" aria-hidden />
              <Chip className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Messaging NextPax
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1100}>
            <TechNote className="mt-3 text-center">messaging_model=api · redirection e-mail · user_ids · HTTP 200 ≠ message relayé</TechNote>
          </Reveal>
        </div>
      </div>
    </SlideFrame>
  );
}

const activationRows = ["Lot 1", "Lot 2", "Lot 3", "Lot 4"];
const activationChannels = ["Airbnb", "Booking", "Abritel"];
const activationStates = [
  ["active", "active", "active"],
  ["active", "active", "progress"],
  ["active", "progress", "progress"],
  ["progress", "review", "progress"],
] as const;

function ActivationStatus({ state }: { state: (typeof activationStates)[number][number] }) {
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Actif
      </span>
    );
  }
  if (state === "review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-200">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        À corriger
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-zinc-400">
      <RefreshCw className="h-3.5 w-3.5 animate-spin [animation-duration:2.5s]" aria-hidden />
      En cours
    </span>
  );
}

function MultichannelSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-220px] top-[-140px] h-[520px] w-[680px]" />
      <SlideHeader kicker="Bonus">Activation en masse. Verdict en ~3 minutes.</SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-10">
        <div>
          <Reveal delay={400}>
            <BigFigure value="~3 min" caption="verdict observé pour l’activation multi-canal" />
          </Reveal>
          <Bullets
            className="mt-8 text-[19px]"
            items={[
              "Airbnb + Booking + Abritel, activés ensemble",
              "Lots de 20 logements · 3 connexions en parallèle",
              "Statuts relus automatiquement toutes les 20 secondes",
              "Erreurs des plateformes traduites en français actionnable",
            ]}
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <Reveal delay={550}>
            <Panel className="overflow-hidden">
              <div className="grid grid-cols-[1.1fr_repeat(3,0.8fr)] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-400">
                <span>Logements</span>
                {activationChannels.map((channel) => (
                  <span key={channel} className="text-center">
                    {channel}
                  </span>
                ))}
              </div>
              {activationRows.map((row, rowIndex) => (
                <div
                  key={row}
                  className="grid grid-cols-[1.1fr_repeat(3,0.8fr)] items-center border-b border-white/[0.06] px-4 py-3.5 last:border-b-0"
                >
                  <span className="font-medium text-zinc-200">{row}</span>
                  {activationStates[rowIndex].map((state, stateIndex) => (
                    <span key={`${row}-${activationChannels[stateIndex]}`} className="flex justify-center">
                      <ActivationStatus state={state} />
                    </span>
                  ))}
                </div>
              ))}
            </Panel>
          </Reveal>
          <Reveal delay={900}>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Chip>Lots de 20 logements</Chip>
              <Chip>3 connexions en parallèle</Chip>
              <Chip>
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-300" aria-hidden />
                Relecture toutes les 20 s
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1050}>
            <p className="mt-4 text-center text-sm leading-relaxed text-zinc-400">
              Un refus plateforme devient une phrase en français : vous savez quoi corriger.
            </p>
          </Reveal>
        </div>
      </div>
    </SlideFrame>
  );
}

const nextPaxSurfaces = ["Supply", "Connect", "ARI", "Messaging", "Promotions", "Reviews", "Notifications"];
const schedules = [
  { label: "Réservations", cadence: "toutes les quelques minutes" },
  { label: "Cautions J0", cadence: "toutes les 15 minutes" },
  { label: "Reversements J+1", cadence: "toutes les 15 minutes" },
  { label: "Sauvegardes", cadence: "chaque nuit" },
];

function ArchitectureSlide() {
  return (
    <SlideFrame>
      <SlideHeader kicker="Sous le capot" className="text-[44px]">
        Sous le capot : ~95 automates.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[205px_minmax(0,1fr)_310px] gap-5">
        <Reveal delay={350}>
          <Panel className="flex h-full flex-col items-center justify-center p-5 text-center">
            <IconBadge icon={Globe} />
            <p className="mt-5 text-xl font-semibold">Interface Cadence</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">React · TypeScript</p>
          </Panel>
        </Reveal>
        <Reveal delay={500}>
          <Panel className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold">~95 Edge Functions</p>
                <p className="mt-1 text-sm text-zinc-400">Deno · serverless · une mission chacune</p>
              </div>
              <Chip>toutes les 15 min</Chip>
            </div>
            <div className="mt-5 grid flex-1 grid-cols-[repeat(19,minmax(0,1fr))] content-center gap-1.5">
              {Array.from({ length: 95 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-3 rounded-sm bg-hk-500/25",
                    index % 17 === 0 && "bg-hk-300",
                    index % 23 === 0 && "bg-hk-500/60",
                  )}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {schedules.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-hk-300" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">{item.label}</p>
                    <p className="truncate text-[11px] text-zinc-500">{item.cadence}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
        <div className="flex min-h-0 flex-col gap-3">
          <Reveal delay={650}>
            <Panel className="p-4">
              <p className="text-lg font-semibold">NextPax</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {nextPaxSurfaces.map((surface) => (
                  <Chip key={surface} className="px-2 py-1 text-[11px]">
                    {surface}
                  </Chip>
                ))}
              </div>
            </Panel>
          </Reveal>
          <Reveal delay={780}>
            <Panel className="p-4">
              <p className="text-lg font-semibold">Stripe</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">Cautions · paiements directs · Connect</p>
            </Panel>
          </Reveal>
          <Reveal delay={910}>
            <Panel className="p-4">
              <p className="text-lg font-semibold">Beyond</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">Flux quotidien · API « Build to Spec »</p>
            </Panel>
          </Reveal>
          <Reveal delay={1040}>
            <div className="flex flex-wrap gap-1.5">
              <Chip className="px-2 py-1 text-[11px]">
                <Mail className="mr-1 h-3 w-3" aria-hidden />
                Resend
              </Chip>
              <Chip className="px-2 py-1 text-[11px]">
                <CloudSun className="mr-1 h-3 w-3" aria-hidden />
                Tarification météo
              </Chip>
              <Chip className="px-2 py-1 text-[11px]">
                <Globe className="mr-1 h-3 w-3" aria-hidden />
                hellokeys.fr
              </Chip>
            </div>
          </Reveal>
        </div>
      </div>
      <Reveal delay={1150}>
        <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-zinc-300">
          <Database className="h-4 w-4 text-hk-300" aria-hidden />
          <span className="font-semibold">Supabase</span>
          <span>Postgres</span>
          <span className="text-zinc-600">·</span>
          <span>RLS</span>
          <span className="text-zinc-600">·</span>
          <span>Vault</span>
        </div>
      </Reveal>
    </SlideFrame>
  );
}

function TransitionSlide() {
  return (
    <SlideFrame className="items-center justify-center px-24 text-center">
      <Glow className="left-1/2 top-1/2 h-[520px] w-[860px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <p className="text-[32px] font-medium text-zinc-400">Le gestionnaire est autonome.</p>
      </Reveal>
      <Reveal delay={500}>
        <h2 className="mt-5 text-[68px] font-semibold tracking-tighter">Et le propriétaire ?</h2>
      </Reveal>
      <Reveal delay={1000}>
        <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-500">
          <PhoneCall className="h-7 w-7" aria-hidden />
        </div>
      </Reveal>
      <Reveal delay={1350}>
        <p className="mt-8 text-balance text-[30px] font-semibold leading-tight text-hk-300">
          Votre propriétaire ne vous appelle plus : il sait déjà.
        </p>
      </Reveal>
    </SlideFrame>
  );
}

const ownerCapabilities = [
  {
    icon: CalendarDays,
    title: "Mes réservations",
    text: "Dates, statut, canal, montant",
  },
  {
    icon: Gauge,
    title: "Prix et disponibilités",
    text: "Jour par jour, jusqu’à 366 jours",
  },
  {
    icon: Lock,
    title: "Mes dates perso",
    text: "Bloquées par moi, avec ou sans ménage",
  },
  {
    icon: Camera,
    title: "Ménages prouvés",
    text: "Photos avant / après",
  },
  {
    icon: Star,
    title: "Tous les avis",
    text: "Sans exception",
  },
  {
    icon: BellRing,
    title: "Alerte instantanée",
    text: "Réservation, modification, annulation",
  },
  {
    icon: Banknote,
    title: "Payé automatiquement",
    text: "Reversement à J+1 du départ",
    featured: true,
  },
];

function OwnerPortalSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-200px] top-[140px] h-[520px] w-[700px]" />
      <SlideHeader kicker="Le portail propriétaire" className="text-[42px]">
        Tout voir, sans demander.
      </SlideHeader>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {ownerCapabilities.map((capability, index) => (
          <Reveal
            key={capability.title}
            delay={350 + index * 130}
            className={cn(capability.featured && "col-span-2")}
          >
            <Panel
              className={cn(
                "h-[136px] p-4",
                capability.featured && "border-hk-300/40 bg-hk-500/15",
              )}
            >
              <IconBadge icon={capability.icon} muted={!capability.featured} />
              <p className="mt-3 text-lg font-semibold leading-tight">{capability.title}</p>
              <p className={cn("mt-1 text-sm leading-snug", capability.featured ? "text-hk-100" : "text-zinc-400")}>
                {capability.text}
              </p>
            </Panel>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-8">
        <Reveal delay={1250}>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-white">366 jours</p>
              <p className="mt-1 text-sm text-zinc-500">de calendrier consultable</p>
            </div>
            <div>
              <p className="text-4xl font-semibold tracking-tight text-white">5 min</p>
              <p className="mt-1 text-sm text-zinc-500">de validité des liens photos</p>
            </div>
            <div>
              <p className="text-4xl font-semibold tracking-tight text-white">0</p>
              <p className="mt-1 text-sm text-zinc-500">coordonnée voyageur exposée</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1450}>
          <Chip className="border-hk-300/30 bg-hk-500/10 px-4 py-2 text-sm text-hk-200">
            La transparence n’est plus une promesse, c’est une API.
          </Chip>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

function MoneySlide() {
  return (
    <SlideFrame>
      <Glow className="left-[-220px] top-[160px] h-[540px] w-[700px]" />
      <SlideHeader kicker="L’argent">Reversé à J+1. Zéro commission cachée.</SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-8">
        <div className="flex min-w-0 flex-col">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
            <Reveal delay={400}>
              <Panel className="p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">Total</p>
                <p className="mt-2 text-2xl font-semibold">réellement encaissé</p>
              </Panel>
            </Reveal>
            <Reveal delay={550}>
              <span className="text-4xl font-semibold text-zinc-500">−</span>
            </Reveal>
            <Reveal delay={650}>
              <Panel className="p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">Frais Stripe</p>
                <p className="mt-2 text-2xl font-semibold">réels</p>
              </Panel>
            </Reveal>
            <Reveal delay={750}>
              <span className="text-4xl font-semibold text-zinc-500">=</span>
            </Reveal>
            <Reveal delay={850}>
              <Panel className="border-hk-300/40 bg-hk-500/15 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-hk-200">Reversement</p>
                <p className="mt-2 text-2xl font-semibold">propriétaire</p>
              </Panel>
            </Reveal>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Reveal delay={1000}>
              <Panel className="p-5">
                <p className="text-lg font-semibold">Jamais deux fois le même virement</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Verrou, groupe de transfert unique et rapprochement Stripe.
                </p>
              </Panel>
            </Reveal>
            <Reveal delay={1120}>
              <Panel className="p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-hk-300" aria-hidden />
                  <p className="text-lg font-semibold">Blocage automatique</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">Litige · remboursement · annulation.</p>
              </Panel>
            </Reveal>
          </div>

          <Reveal delay={1250}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Chip>Départ du voyageur</Chip>
              <ArrowRight className="h-4 w-4 text-hk-300" aria-hidden />
              <Chip>J+1</Chip>
              <ArrowRight className="h-4 w-4 text-hk-300" aria-hidden />
              <Chip>Virement Stripe Connect</Chip>
              <Chip>
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-300" aria-hidden />
                cycle de 15 min
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1380}>
            <TechNote className="mt-4">Frais lus sur balance_transaction · cautions exclues</TechNote>
          </Reveal>
        </div>

        <Reveal delay={650} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center border-hk-300/25 bg-hk-500/10 p-7 text-center">
            <BigFigure value="J+1" caption="après le départ" className="text-[84px]" />
            <div className="my-7 h-px w-full bg-white/10" />
            <BigFigure value="0 €" caption="de commission cachée" className="text-[84px]" />
            <p className="mt-6 text-sm text-zinc-500 line-through decoration-zinc-500/70">Commission de gestion</p>
            <p className="mt-2 text-sm text-zinc-500 line-through decoration-zinc-500/70">Cautions incluses</p>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

const trustItems = [
  {
    icon: KeyRound,
    title: "Clés révocables",
    text: "Seule l’empreinte SHA-256 est stockée, jamais dans le navigateur.",
  },
  {
    icon: Lock,
    title: "Secrets au coffre",
    text: "Supabase Vault : jamais affichés, jamais journalisés.",
  },
  {
    icon: ShieldCheck,
    title: "Données cloisonnées",
    text: "RLS, vérification JWT et attribution du logement avant chaque appel.",
  },
  {
    icon: Gauge,
    title: "120 appels / minute",
    text: "Quota par clé, avec Retry-After respecté.",
  },
  {
    icon: BadgeCheck,
    title: "Actions sensibles",
    text: "Réservées au titulaire du compte, pas aux collaborateurs.",
  },
  {
    icon: Landmark,
    title: "Identité et banque",
    text: "Vérifiées par Stripe ; bénéficiaire figé au moment du paiement.",
  },
];

function TrustSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-220px] top-[-120px] h-[520px] w-[720px]" />
      <SlideHeader kicker="La confiance">Tout montrer. Sans rien exposer.</SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_310px] gap-8">
        <div className="grid grid-cols-2 gap-4">
          {trustItems.map((item, index) => (
            <Reveal key={item.title} delay={400 + index * 120}>
              <Panel className="h-[128px] p-4">
                <div className="flex items-center gap-3">
                  <IconBadge icon={item.icon} />
                  <p className="text-lg font-semibold">{item.title}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
        <Reveal delay={950} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center p-8 text-center">
            <BigFigure value="0" caption="coordonnée voyageur exposée au propriétaire" />
            <div className="mt-8 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-400">
              Chacun ne voit que ses données.
            </div>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

function ClosingSlide() {
  return (
    <SlideFrame className="items-center justify-center px-20 text-center">
      <Glow className="left-1/2 top-1/2 h-[620px] w-[980px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <div className="flex items-center justify-center gap-3">
          <Chip>&lt; 5 min</Chip>
          <Chip>J+1</Chip>
          <Chip>0 €</Chip>
        </div>
      </Reveal>
      <Reveal delay={350}>
        <h2 className="mt-9 max-w-6xl text-balance text-[66px] font-semibold leading-[1.05] tracking-tighter">
          La confiance n’est plus déclarée :
          <br />
          <span className="bg-gradient-to-r from-white to-hk-300 bg-clip-text text-transparent">elle est affichée.</span>
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mt-9 text-[24px] font-medium text-zinc-300">
          Demandez votre démonstration. Ouvrez le portail à vos propriétaires.
        </p>
      </Reveal>
      <Reveal delay={1100}>
        <div className="mt-10">
          <Wordmark />
        </div>
      </Reveal>
    </SlideFrame>
  );
}

export const keynoteSlides: KeynoteSlide[] = [
  {
    id: "ouverture",
    label: "Ouverture",
    Component: OpeningSlide,
    notes: [
      "Bonjour à toutes et à tous. Je voudrais commencer par un moment que vous connaissez par cœur. Dimanche soir. Un logement reste vide la semaine prochaine. Vous savez exactement quoi faire : une offre de dernière minute. Mais vous ne pouvez pas la créer vous-même. Il faut écrire au support. Attendre. Et lundi, il sera peut-être trop tard.",
      "Ce moment-là, nous avons décidé de le supprimer. Pas avec un grand discours. Avec quelque chose de plus simple, et de plus exigeant : vous rendre, chaque jour, un peu plus autonomes.",
      "Aujourd’hui, je ne vais pas vous faire de promesses. Je vais vous montrer trois gestes que nos clients font désormais seuls. Puis je vous montrerai jusqu’où va cette autonomie : jusqu’à vos propriétaires.",
      "Cadence. Chaque jour, un peu plus autonome.",
    ],
    transition: "Pour mesurer le chemin parcouru, revenons d’abord à ce que vivait un gestionnaire avant.",
  },
  {
    id: "probleme",
    label: "Le problème",
    Component: ProblemSlide,
    notes: [
      "Voici la journée d’un gestionnaire sans Cadence. Regardez bien : aucune de ces lignes n’est un problème de compétence. Vous savez quoi faire. On ne vous laisse simplement pas le faire.",
      "Vous voulez lancer une offre ? Vous ouvrez un ticket, et vous attendez quarante-huit heures. Vous voulez mettre vos logements en ligne ? Vous refaites les mêmes clics, plateforme après plateforme, pendant des journées.",
      "Et puis il y a le téléphone. Votre propriétaire appelle. Il ne se plaint pas. Il veut juste savoir : est-ce que c’est loué ? Le ménage est-il fait ? Quand suis-je payé ? Vous cherchez, vous rappelez, vous rassurez. Et ses revenus, il les découvre sur un relevé, une fois par mois.",
      "Le vrai coût, ce n’est pas seulement le temps. C’est la dépendance. Vous dépendez du support. Votre propriétaire dépend de vous. Personne n’est autonome.",
    ],
    transition: "Nous avons pris le problème à l’envers : et si c’était la plateforme qui changeait, chaque jour ?",
  },
  {
    id: "promesse",
    label: "La promesse",
    Component: PromiseSlide,
    notes: [
      "Cadence n’est pas un logiciel figé. C’est une plateforme vivante. Des fonctionnalités arrivent en continu, et chacune est pensée avec la même question : que pouvez-vous faire seul aujourd’hui, que vous deviez demander hier ?",
      "C’est possible parce que Cadence est branchée en profondeur sur NextPax, un channel manager certifié. Un channel manager, c’est le standard téléphonique entre vous et les plateformes de réservation, les OTA : vous parlez une fois, il transmet à Booking, à Airbnb et aux autres. Et Cadence utilise toutes ses lignes : les logements, les annonces, les prix, les messages, les promotions, les avis.",
      "Résultat : ce que vous décidez dans Cadence part réellement sur les plateformes. Sans ticket. Sans attendre. Même un dimanche soir.",
      "Je ne vais pas vous demander de me croire sur parole. Je vais vous le montrer. Trois démonstrations. Trois gestes que nos clients font eux-mêmes.",
    ],
    transition: "Commençons par ce fameux dimanche soir.",
  },
  {
    id: "demo-promotion",
    label: "Démo 1 · Promotion en 5 minutes",
    Component: PromotionSlide,
    notes: [
      "Dimanche soir, donc. Premier écran : la page Promotions. Deuxième écran : le canal. Cinq sont disponibles : Booking.com, Airbnb, Expedia, Vrbo, Marriott. Troisième écran : le type d’offre. Et ici, un détail compte. Cette liste, nous ne l’avons pas recopiée. Cadence la lit en direct chez NextPax : dernière minute avec son seuil en heures, réservation anticipée, dates de séjour. Vous voyez les vraies règles de chaque canal. Quatrième écran : la remise. Vous validez.",
      "À cet instant, Cadence appelle l’API Promotions de NextPax. Une API, c’est un guichet entre deux logiciels : Cadence y dépose l’offre avec la liste des canaux concernés, et NextPax la distribue aux plateformes. Vous ne ressaisissez rien, nulle part.",
      "Ensuite, vous gardez la main : pause ou réactivation en un geste, remise modifiable, filtres par statut.",
      "Ce qui prenait un appel au support et quarante-huit heures prend cinq minutes, seul, un dimanche soir.",
    ],
    transition: "Une offre attire le regard. Mais ce que le voyageur voit en premier, c’est une photo.",
  },
  {
    id: "demo-photos",
    label: "Démo 2 · Ordre des photos",
    Component: PhotosSlide,
    notes: [
      "Ouvrez une fiche logement. Voici la galerie. Je prends cette vignette, je la glisse en première position, je la dépose. C’est tout. Vous préférez les flèches ? Elles sont là. Et le bouton « photo principale » : un clic.",
      "Chaque photo reçoit aussi une étiquette : chambre, salle de bain, vue. Ce sont les codes de type de NextPax : la photo part avec son étiquette.",
      "Maintenant, j’enregistre. Chaque photo reçoit un numéro d’ordre, que NextPax appelle la priorité d’affichage. Ce numéro part avec la fiche du logement. Autrement dit : l’ordre choisi dans Cadence est l’ordre affiché sur vos annonces.",
      "Et la chaîne est complète. Vous téléversez en masse. Cadence conserve un miroir sécurisé de vos images. Une page de contrôle affiche l’état de synchronisation de chaque logement, exportable en CSV, c’est-à-dire en simple tableau.",
      "La première photo vend le séjour. Nos clients la choisissent eux-mêmes — et elle est en ligne.",
    ],
    transition: "L’offre est en ligne, l’annonce est belle : le voyageur écrit. Où arrive son message ?",
  },
  {
    id: "demo-messages",
    label: "Démo 3 · Messages unifiés",
    Component: MessagesSlide,
    notes: [
      "Voici la boîte de réception. Une seule, pour toutes les plateformes. Ce ne sont pas des copies : ce sont les vrais fils de conversation, lus chez NextPax. Dernier message, badge non lu. Vous ouvrez : tout l’historique est là. Vous répondez : la réponse repart vers le bon canal.",
      "Maintenant, ce que vous ne voyez pas. Pour qu’un message parte vers Airbnb, NextPax doit connaître l’identifiant hôte de l’annonce. S’il en manque un seul, le piège est sournois : NextPax répond « bien reçu », et le message n’arrive jamais. Aucune erreur visible. C’est une lettre déposée au guichet sans la bonne adresse : on vous remercie, et elle ne part pas.",
      "Cadence règle cela seule. Une fois par jour, elle rassemble tous les identifiants hôte de vos annonces et met la configuration à jour. Vous n’y pensez jamais.",
      "Ajoutez les messages automatiques, déclenchés par les événements de réservation, et les notifications push.",
      "Zéro message perdu, zéro application OTA à ouvrir : toute la relation voyageur est ici.",
    ],
    transition: "Trois gestes, un logement à la fois. Et quand il faut le faire pour tout un parc ?",
  },
  {
    id: "bonus-multicanal",
    label: "Bonus · Activation en masse",
    Component: MultichannelSlide,
    notes: [
      "Un bonus. Mettre un logement en ligne sur une plateforme, cela se fait à la main. Mettre tout un parc sur trois plateformes, c’étaient des journées de clics.",
      "Dans Cadence, vous sélectionnez vos logements, vous choisissez Airbnb, Booking, Abritel, et vous lancez. La plateforme enregistre par lots de vingt logements, avec trois connexions en parallèle. Trois guichets ouverts en même temps, plutôt qu’une seule file d’attente.",
      "Ensuite, inutile de rafraîchir la page. Cadence relit seule les statuts toutes les vingt secondes, jusqu’au verdict. Ce que nous observons : environ trois minutes.",
      "Et si une plateforme refuse une annonce ? Vous ne recevez pas un code obscur. Vous recevez une phrase en français, qui vous dit quoi corriger.",
      "Ce qui prenait des journées de clics prend quelques minutes.",
    ],
    transition: "Vous vous demandez peut-être ce qui rend tout cela possible. Soulevons le capot un instant.",
  },
  {
    id: "architecture",
    label: "Sous le capot",
    Component: ArchitectureSlide,
    notes: [
      "Une seule diapositive technique, promis. Et sans jargon.",
      "À gauche, votre écran. À droite, les partenaires : NextPax pour les plateformes, Stripe pour l’argent, Beyond pour la tarification dynamique. Au milieu, environ quatre-vingt-quinze Edge Functions. Imaginez quatre-vingt-quinze petits automates, chacun avec une seule mission, qui ne se réveillent que lorsqu’on a besoin d’eux.",
      "Certains ont un réveil programmé. Toutes les quelques minutes, l’un relève les nouvelles réservations, comme on relève une boîte aux lettres. Toutes les quinze minutes, un autre traite les cautions du jour J. Un autre encore, les reversements du lendemain du départ. Et chaque nuit, une sauvegarde.",
      "Deux protections entourent l’ensemble. Le Vault : un coffre-fort où dorment les secrets. Et la RLS : un vigile posté devant chaque ligne de données, qui contrôle votre badge avant de vous laisser lire.",
      "Retenez une seule chose : la machine travaille, même quand vous dormez.",
    ],
    transition: "Voilà pour le gestionnaire. Mais il reste quelqu’un dans cette histoire.",
  },
  {
    id: "transition-proprietaire",
    label: "Transition propriétaire",
    Component: TransitionSlide,
    notes: [
      "Reprenons. Une promotion : seul, en cinq minutes. Les photos : à la souris. Les messages : au même endroit. Tout un parc en ligne : en quelques minutes. Le gestionnaire est autonome.",
      "Mais souvenez-vous du téléphone. Celui qui sonne pour demander : c’est loué ? Le ménage est fait ? Quand suis-je payé ? Ces appels ne viennent pas d’un manque de confiance. Ils viennent d’un manque d’information. Votre propriétaire vous a confié un bien qui compte pour lui. Et il ne voit rien.",
      "Alors nous nous sommes posé la même question que pour vous. Qu’est-ce qu’il doit encore demander, alors qu’il pourrait simplement le voir ?",
      "Le gestionnaire est autonome. Le propriétaire, lui, devient informé sans avoir à demander.",
      "C’est le cœur de ce que nous vous présentons aujourd’hui.",
      "Votre propriétaire ne vous appelle plus : il sait déjà.",
    ],
    transition: "Voici le portail propriétaire.",
  },
  {
    id: "portail-proprietaire",
    label: "Portail propriétaire",
    Component: OwnerPortalSlide,
    notes: [
      "Le portail propriétaire est un site séparé de Cadence. Il est alimenté par une API privée et sécurisée : un guichet réservé, où chaque propriétaire ne voit que les logements attribués à son profil. Rien d’autre.",
      "Sept capacités. Ses réservations : dates, statut, canal, montant — jamais les coordonnées des voyageurs. Ses prix et ses disponibilités, jour par jour, jusqu’à trois cent soixante-six jours. Ses dates personnelles : il les bloque lui-même, avec ou sans ménage. Ses ménages, prouvés par des photos avant et après. Tous ses avis, sans exception. Une alerte à chaque réservation, modification ou annulation. C’est un webhook : une sonnette. Au lieu de venir vérifier, le portail est prévenu. Et chaque alerte porte un sceau, qui prouve qu’elle vient bien de Cadence. Enfin, son argent, versé automatiquement.",
      "Chaque euro encaissé, chaque ménage photographié, chaque avis — visible en direct.",
      "La transparence n’est plus une promesse, c’est une API.",
    ],
    transition: "Six de ces capacités informent. La septième fait mieux : elle paie.",
    cheatSheet: [
      {
        capacity: "Réservations",
        source: "owner-site-reservations",
        say: "Dates, statut, canal, référence, montant du séjour. Ni coordonnées voyageurs, ni données Stripe.",
      },
      {
        capacity: "Prix et disponibilités",
        source: "owner-site-calendar",
        say: "Lecture seule, jusqu’à 366 jours : prix Cadence, disponibilité NextPax, blocages locaux.",
      },
      {
        capacity: "Blocage de dates",
        source: "owner-site-blocks",
        say: "Permission d’écriture explicite. Chaque demande porte une Idempotency-Key UUID : un numéro de ticket unique. Reçue deux fois, exécutée une fois.",
      },
      {
        capacity: "Ménages",
        source: "owner-site-cleaning",
        say: "Interventions, statuts, pièces, photos. Liens signés valables 5 minutes : un ticket de vestiaire qui expire. Aucune consigne d’accès privée transmise.",
      },
      {
        capacity: "Avis",
        source: "owner-site-reviews",
        say: "Pagination intégrale, sans plafond artificiel. Chaque page est signée : comme un livre aux pages numérotées, s’il en manque une, cela se voit.",
      },
      {
        capacity: "Notification",
        source: "Webhook HMAC-SHA256",
        say: "La sonnette, avec un sceau de cire qui prouve l’expéditeur. File durable : si personne n’ouvre, on resonne en espaçant les essais. Test de signature sans notification fictive. Pause et reprise depuis l’interface.",
      },
      {
        capacity: "Paiement",
        source: "Stripe Connect",
        say: "Reversement automatique à J+1, détaillé sur la slide suivante.",
      },
    ],
  },
  {
    id: "argent",
    label: "L’argent",
    Component: MoneySlide,
    notes: [
      "Parlons d’argent. C’est là que la confiance se gagne, ou se perd.",
      "Le lendemain du départ du voyageur, le reversement part vers le propriétaire. Automatiquement. Toutes les quinze minutes, un automate repère les séjours arrivés à J+1 et lance les virements par Stripe Connect : le circuit qui relie Stripe au compte du propriétaire.",
      "Le montant ? Le total réellement encaissé, moins uniquement les frais Stripe réels. Pas une estimation : Cadence les lit sur la ligne de relevé de Stripe elle-même. Zéro commission de gestion. Et les cautions n’entrent jamais dans le calcul.",
      "Deux sécurités. D’abord, jamais de doublon. On appelle cela l’idempotence : appuyer deux fois sur le bouton de l’ascenseur ne le fait pas venir deux fois. Ici : un verrou, un identifiant de virement unique, et un rapprochement avec Stripe. Ensuite, en cas de litige, de remboursement ou d’annulation, le reversement se bloque de lui-même.",
      "Zéro euro de commission cachée.",
    ],
    transition: "Montrer autant et reverser aussi vite n’a de valeur que si tout est parfaitement protégé.",
  },
  {
    id: "confiance",
    label: "La confiance",
    Component: TrustSlide,
    notes: [
      "Tout montrer ne veut pas dire tout exposer. Six verrous.",
      "Un : les clés d’accès. Elles sont révocables, et Cadence n’en conserve que le hash, c’est-à-dire l’empreinte digitale. Avec l’empreinte, on reconnaît la clé. On ne peut pas la refabriquer. Et elle n’est jamais dans le navigateur.",
      "Deux : les secrets dorment dans le coffre, le Vault. Jamais affichés, jamais écrits dans les journaux techniques.",
      "Trois : avant chaque appel, Cadence contrôle le badge de l’utilisateur, puis vérifie que le logement lui est bien attribué. Le vigile est à chaque porte.",
      "Quatre : un tourniquet. Cent vingt appels par minute et par clé. Au-delà, on vous indique quand revenir.",
      "Cinq : les actions sensibles sont réservées au titulaire du compte. Pas aux collaborateurs.",
      "Six : l’identité et les coordonnées bancaires sont vérifiées par Stripe, et le bénéficiaire est figé au moment du paiement.",
      "Et je le rappelle : zéro coordonnée voyageur exposée au propriétaire.",
    ],
    transition: "Il me reste une phrase à vous dire.",
  },
  {
    id: "conclusion",
    label: "Conclusion",
    Component: ClosingSlide,
    notes: [
      "Revenons à ce dimanche soir. La promotion est en ligne : cinq minutes, seul. La bonne photo est en tête de l’annonce. Le voyageur a écrit, vous avez répondu, au même endroit. Et votre téléphone ne sonne pas. Votre propriétaire a vu la réservation arriver. Il verra le ménage, photos à l’appui. Il lira l’avis. Et le lendemain du départ, son reversement partira.",
      "Personne n’a rien demandé à personne.",
      "C’est cela, l’autonomie. Non pas travailler seul : ne plus dépendre. Vous ne dépendez plus d’un support. Votre propriétaire ne dépend plus de vos nouvelles.",
      "Et demain, il y aura une fonctionnalité de plus. Puis une autre. Chaque jour, un peu plus autonome.",
      "Alors voici ce que je vous propose : demandez votre démonstration, et ouvrez le portail à vos premiers propriétaires.",
      "La confiance n’est plus déclarée : elle est affichée.",
      "Merci.",
    ],
    transition: "Fin de la keynote. Laisser le slogan à l’écran pendant les questions.",
  },
];
