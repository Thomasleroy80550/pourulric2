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
  Eye,
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
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Star,
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

function FlowArrow({ label, delay = 0 }: { label?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="flex flex-col items-center gap-2 text-hk-600">
      <ArrowRight className="h-8 w-8" aria-hidden />
      {label && <span className="font-mono text-[11px] uppercase tracking-[0.18em]">{label}</span>}
    </Reveal>
  );
}

function OpeningSlide() {
  return (
    <SlideFrame className="items-center justify-center bg-white px-24 text-center">
      <Glow className="left-1/2 top-1/2 h-[560px] w-[920px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute inset-x-0 top-12 flex justify-center">
        <Reveal>
          <Wordmark />
        </Reveal>
      </div>
      <Reveal delay={300}>
        <h1 className="max-w-5xl text-balance text-[76px] font-semibold leading-[1.02] tracking-[-0.055em]">
          Votre location,
          <br />
          <span className="bg-gradient-to-r from-neutral-950 to-hk-600 bg-clip-text text-transparent">
            en toute confiance.
          </span>
        </h1>
      </Reveal>
    </SlideFrame>
  );
}

const ownerQuestions = [
  {
    icon: CalendarDays,
    question: "Est-ce que mon logement est loué ?",
    answer: "La réponse doit être visible, pas demandée.",
  },
  {
    icon: Camera,
    question: "Le ménage est-il vraiment fait ?",
    answer: "Une preuve vaut mieux qu’une phrase.",
  },
  {
    icon: Banknote,
    question: "Quand serai-je payé ?",
    answer: "Le calendrier du versement doit être clair.",
  },
  {
    icon: FileText,
    question: "Et mes revenus ?",
    answer: "Un relevé mensuel ne suffit plus.",
  },
];

function ProblemSlide() {
  return (
    <SlideFrame>
      <SlideHeader kicker="Le constat" muted className="text-[48px]">
        Avant, il fallait demander pour savoir.
      </SlideHeader>
      <div className="mt-10 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_350px] gap-10">
        <div className="space-y-4">
          {ownerQuestions.map((item, index) => (
            <Reveal key={item.question} delay={450 + index * 160}>
              <Panel className="flex items-center gap-5 p-5">
                <IconBadge icon={item.icon} muted />
                <div>
                  <p className="text-[23px] font-semibold leading-tight text-neutral-900">{item.question}</p>
                  <p className="mt-1 text-[18px] leading-snug text-neutral-500">{item.answer}</p>
                </div>
              </Panel>
            </Reveal>
          ))}
        </div>
        <Reveal delay={1050} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center p-8 text-center">
            <BigFigure muted value="1 / mois" caption="le rythme habituel du relevé de revenus" className="text-[88px]" />
            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-neutral-400">Trop tard. Trop peu visible.</p>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

const cadenceAreas = [
  { icon: Megaphone, label: "Promotions" },
  { icon: Images, label: "Annonces" },
  { icon: MessageSquare, label: "Messages" },
  { icon: Banknote, label: "Reversements" },
];

function PromiseSlide() {
  return (
    <SlideFrame className="bg-white">
      <Glow className="right-[-180px] top-[-160px] h-[520px] w-[720px]" />
      <SlideHeader kicker="La réponse Hello Keys" className="text-[50px]">
        Hello Keys a développé Cadence.
      </SlideHeader>
      <div className="mt-10 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-12">
        <Bullets
          items={[
            "Une plateforme interne vivante, enrichie en continu",
            "Elle automatise la gestion locative au quotidien",
            "Elle alimente votre espace propriétaire",
            "Résultat : moins d’attente, plus de visibilité",
          ]}
        />
        <Reveal delay={650}>
          <Panel className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Wordmark />
            <div className="mt-9 grid w-full grid-cols-2 gap-3">
              {cadenceAreas.map((area, index) => (
                <Reveal key={area.label} delay={850 + index * 120}>
                  <div className="rounded-3xl border border-black/[0.06] bg-[#f5f5f7] p-4">
                    <IconBadge icon={area.icon} className="mx-auto" />
                    <p className="mt-3 text-sm font-semibold text-neutral-800">{area.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

const channelPromotions = [
  { name: "Booking.com", code: "BOO142" },
  { name: "Airbnb", code: "AIR298" },
  { name: "Expedia", code: "EXP270" },
  { name: "Vrbo", code: "HOM143" },
  { name: "Marriott", code: "MAR392" },
];

const promotionSteps = [
  "L’équipe Hello Keys ouvre la page Promotions",
  "Cadence lit les règles du canal en direct",
  "La remise est envoyée aux plateformes sans ressaisie",
  "L’offre peut être activée, modifiée ou mise en pause",
];

function PromotionSlide() {
  return (
    <SlideFrame>
      <Glow className="left-[-220px] top-[220px] h-[520px] w-[640px]" />
      <SlideHeader kicker="Preuve 1" className="text-[46px]">
        Une période creuse devient une offre en ligne.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[520px_minmax(0,1fr)] gap-10">
        <div className="space-y-3">
          {promotionSteps.map((step, index) => (
            <Reveal key={step} delay={400 + index * 150}>
              <Panel className="flex items-center gap-4 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hk-500/10 text-lg font-semibold text-hk-700">
                  {index + 1}
                </span>
                <p className="text-xl font-semibold leading-tight text-neutral-800">{step}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-5">
          <Reveal delay={850}>
            <Panel className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Cinq canaux possibles</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {channelPromotions.map((channel) => (
                  <Chip key={channel.code}>
                    {channel.name}
                    <span className="ml-2 font-mono text-[11px] text-hk-700">{channel.code}</span>
                  </Chip>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Types d’offre réels</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip>Dernière minute · seuil en heures</Chip>
                <Chip>Early bird</Chip>
                <Chip>Dates de séjour</Chip>
              </div>
            </Panel>
          </Reveal>
          <div className="mt-auto flex items-end justify-between gap-6">
            <Reveal delay={1150}>
              <BigFigure value="< 5 min" caption="pour créer et diffuser la promotion" />
            </Reveal>
            <Reveal delay={1350}>
              <div className="mb-2 flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-50 px-4 py-2 text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                En ligne
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
const photoTones = [
  "from-sky-100 to-blue-200",
  "from-cyan-100 to-sky-200",
  "from-indigo-100 to-blue-200",
  "from-teal-100 to-cyan-200",
];

function PhotoTile({ index, label, principal }: { index: number; label: string; principal?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3",
        principal ? "border-hk-500/50 shadow-[0_12px_30px_rgba(0,113,227,0.14)]" : "border-black/[0.06]",
        photoTones[index % photoTones.length],
      )}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/75 text-sm font-semibold text-neutral-800 shadow-sm">
          {index + 1}
        </span>
        {principal && <Chip className="border-hk-500/20 bg-white/75 px-2 py-1 text-[11px] text-hk-700">Principale</Chip>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="rounded-md bg-white/70 px-2 py-1 text-[12px] text-neutral-700 shadow-sm">{label}</span>
        <ImageIcon className="h-4 w-4 text-neutral-500" aria-hidden />
      </div>
    </div>
  );
}

function PhotoGrid({ title, delay }: { title: string; delay: number }) {
  return (
    <Reveal delay={delay} className="w-[330px] shrink-0">
      <Panel className="p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">{title}</p>
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
    <SlideFrame className="bg-white">
      <Glow className="right-[-160px] top-[180px] h-[500px] w-[620px]" />
      <SlideHeader kicker="Preuve 2" className="text-[46px]">
        Votre première photo travaille pour vous.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-8">
        <Bullets
          className="mt-3 text-[19px]"
          items={[
            "L’ordre des photos est piloté dans Cadence",
            "La photo principale est choisie en un clic",
            "Chaque photo part étiquetée avec son type",
            "L’ordre retenu est répercuté sur les annonces",
            "Une page de contrôle suit la synchronisation",
          ]}
        />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex items-center justify-center gap-5">
            <PhotoGrid title="Dans Cadence" delay={450} />
            <FlowArrow label="displayPriority" delay={850} />
            <PhotoGrid title="Sur l’annonce" delay={1050} />
          </div>
          <Reveal delay={1250}>
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-neutral-500">
              <Upload className="h-4 w-4 text-hk-600" aria-hidden />
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
  return <div className={cn("h-2.5 rounded-full bg-black/[0.08]", className)} />;
}

function InboxMock() {
  return (
    <Reveal delay={500}>
      <Panel className="overflow-hidden">
        <div className="grid h-[300px] grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-r border-black/[0.06] bg-[#f5f5f7] p-3">
            {inboxThreads.map((thread) => (
              <div
                key={thread.channel}
                className={cn(
                  "mb-2 rounded-2xl border bg-white p-3 shadow-sm",
                  thread.active ? "border-hk-500/30" : "border-black/[0.04]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-800">{thread.channel}</span>
                  {thread.unread > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-hk-500 px-1.5 text-[11px] font-semibold text-white">
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
            <div className="flex items-center gap-3 border-b border-black/[0.06] pb-3">
              <MessageSquare className="h-5 w-5 text-hk-600" aria-hidden />
              <div className="flex-1">
                <SkeletonBar className="w-40" />
                <SkeletonBar className="mt-2 w-24" />
              </div>
              <Chip>Historique complet</Chip>
            </div>
            <div className="flex-1 space-y-3 py-4">
              <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-[#f5f5f7] p-3">
                <SkeletonBar className="w-full" />
                <SkeletonBar className="mt-2 w-2/3" />
              </div>
              <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-hk-500 p-3">
                <SkeletonBar className="w-full bg-white/40" />
                <SkeletonBar className="mt-2 w-1/2 bg-white/40" />
              </div>
              <div className="max-w-[64%] rounded-2xl rounded-bl-sm bg-[#f5f5f7] p-3">
                <SkeletonBar className="w-5/6" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm">
              <SkeletonBar className="flex-1" />
              <span className="text-sm font-medium text-hk-700">Répondre</span>
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
      <SlideHeader kicker="Preuve 3" className="text-[46px]">
        Chaque message voyageur trouve sa réponse.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[410px_minmax(0,1fr)] gap-8">
        <Bullets
          className="mt-3 text-[19px]"
          items={[
            "Les conversations des plateformes arrivent dans une boîte unique",
            "L’historique complet reste disponible",
            "Les réponses repartent sur le bon canal",
            "Messages automatiques et notifications aident l’équipe",
            "Cadence vérifie la configuration chaque jour",
          ]}
        />
        <div className="flex min-w-0 flex-col justify-center">
          <InboxMock />
          <Reveal delay={950}>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Chip>Tous les IDs hôte Airbnb</Chip>
              <ArrowRight className="h-4 w-4 text-hk-600" aria-hidden />
              <Chip>Fusion automatique · 1 fois par jour</Chip>
              <ArrowRight className="h-4 w-4 text-hk-600" aria-hidden />
              <Chip className="border-emerald-500/20 bg-emerald-50 text-emerald-700">
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

const activationRows = ["Votre logement", "Un deuxième bien", "Un troisième bien", "Un quatrième bien"];
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Actif
      </span>
    );
  }
  if (state === "review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        À corriger
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 shadow-sm">
      <RefreshCw className="h-3.5 w-3.5 animate-spin [animation-duration:2.5s]" aria-hidden />
      En cours
    </span>
  );
}

function MultichannelSlide() {
  return (
    <SlideFrame className="bg-white">
      <Glow className="right-[-220px] top-[-140px] h-[520px] w-[680px]" />
      <SlideHeader kicker="Diffusion" className="text-[46px]">
        Votre logement peut être diffusé plus vite.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-10">
        <div>
          <Reveal delay={400}>
            <BigFigure value="~3 min" caption="verdict observé pour une activation multi-canal" />
          </Reveal>
          <Bullets
            className="mt-8 text-[19px]"
            items={[
              "Airbnb, Booking et Abritel activés ensemble",
              "Traitement par lots de 20 logements",
              "Statuts relus automatiquement toutes les 20 secondes",
              "Erreurs plateforme traduites en français actionnable",
            ]}
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <Reveal delay={550}>
            <Panel className="overflow-hidden">
              <div className="grid grid-cols-[1.1fr_repeat(3,0.8fr)] border-b border-black/[0.06] bg-[#f5f5f7] px-4 py-3 text-sm font-semibold text-neutral-500">
                <span>Diffusion</span>
                {activationChannels.map((channel) => (
                  <span key={channel} className="text-center">
                    {channel}
                  </span>
                ))}
              </div>
              {activationRows.map((row, rowIndex) => (
                <div
                  key={row}
                  className="grid grid-cols-[1.1fr_repeat(3,0.8fr)] items-center border-b border-black/[0.05] px-4 py-3.5 last:border-b-0"
                >
                  <span className="font-medium text-neutral-700">{row}</span>
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
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-600" aria-hidden />
                Relecture toutes les 20 s
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1050}>
            <p className="mt-4 text-center text-sm leading-relaxed text-neutral-500">
              Si une plateforme refuse une annonce, l’équipe sait quoi corriger.
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
      <SlideHeader kicker="Sous le capot" className="text-[46px]">
        Cadence travaille en arrière-plan.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[205px_minmax(0,1fr)_310px] gap-5">
        <Reveal delay={350}>
          <Panel className="flex h-full flex-col items-center justify-center p-5 text-center">
            <IconBadge icon={Globe} />
            <p className="mt-5 text-xl font-semibold">Hello Keys</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">Votre espace propriétaire est alimenté par Cadence.</p>
          </Panel>
        </Reveal>
        <Reveal delay={500}>
          <Panel className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold">~95 Edge Functions</p>
                <p className="mt-1 text-sm text-neutral-500">De petits automates serverless, une mission chacun.</p>
              </div>
              <Chip>cycles de 15 min</Chip>
            </div>
            <div className="mt-5 grid flex-1 grid-cols-[repeat(19,minmax(0,1fr))] content-center gap-1.5">
              {Array.from({ length: 95 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-3 rounded-sm bg-hk-500/15",
                    index % 17 === 0 && "bg-hk-500",
                    index % 23 === 0 && "bg-hk-500/45",
                  )}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {schedules.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-3 py-2 shadow-sm">
                  <Clock3 className="h-4 w-4 shrink-0 text-hk-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800">{item.label}</p>
                    <p className="truncate text-[11px] text-neutral-500">{item.cadence}</p>
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
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">Cautions · paiements directs · Connect</p>
            </Panel>
          </Reveal>
          <Reveal delay={910}>
            <Panel className="p-4">
              <p className="text-lg font-semibold">Beyond</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">Flux quotidien · API « Build to Spec »</p>
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
        <div className="mt-5 flex items-center justify-center gap-4 rounded-3xl border border-black/[0.06] bg-white/80 px-5 py-3 text-sm text-neutral-600 shadow-sm">
          <Database className="h-4 w-4 text-hk-600" aria-hidden />
          <span className="font-semibold text-neutral-900">Supabase</span>
          <span>Postgres</span>
          <span className="text-neutral-300">·</span>
          <span>RLS</span>
          <span className="text-neutral-300">·</span>
          <span>Vault</span>
        </div>
      </Reveal>
    </SlideFrame>
  );
}

function TransitionSlide() {
  return (
    <SlideFrame className="items-center justify-center bg-white px-24 text-center">
      <Glow className="left-1/2 top-1/2 h-[520px] w-[860px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <p className="text-[32px] font-medium text-neutral-500">Cadence gère.</p>
      </Reveal>
      <Reveal delay={450}>
        <h2 className="mt-4 text-[68px] font-semibold tracking-[-0.055em] text-neutral-950">Vous voyez.</h2>
      </Reveal>
      <Reveal delay={900}>
        <div className="mx-auto mt-10 flex items-center justify-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-black/[0.06] bg-white text-neutral-400 shadow-sm">
            <PhoneCall className="h-7 w-7" aria-hidden />
          </div>
          <ArrowRight className="h-7 w-7 text-hk-600" aria-hidden />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hk-500 text-white shadow-[0_18px_45px_rgba(0,113,227,0.24)]">
            <Eye className="h-7 w-7" aria-hidden />
          </div>
        </div>
      </Reveal>
      <Reveal delay={1250}>
        <p className="mt-8 text-balance text-[30px] font-semibold leading-tight text-hk-700">
          Vous n’appelez plus pour une nouvelle : elle est déjà là.
        </p>
      </Reveal>
    </SlideFrame>
  );
}

const ownerCapabilities = [
  {
    icon: CalendarDays,
    title: "Vos réservations",
    text: "Dates, statut, canal, montant",
  },
  {
    icon: Gauge,
    title: "Prix et disponibilités",
    text: "Jour par jour, jusqu’à 366 jours",
  },
  {
    icon: Lock,
    title: "Vos dates perso",
    text: "Bloquez-les, avec ou sans ménage",
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
    title: "Alertes instantanées",
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
      <SlideHeader kicker="Votre espace propriétaire" className="text-[44px]">
        Tout voir, sans demander.
      </SlideHeader>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {ownerCapabilities.map((capability, index) => (
          <Reveal key={capability.title} delay={350 + index * 130} className={cn(capability.featured && "col-span-2")}>
            <Panel
              className={cn(
                "h-[136px] p-4",
                capability.featured && "border-hk-500/25 bg-hk-50",
              )}
            >
              <IconBadge icon={capability.icon} muted={!capability.featured} />
              <p className="mt-3 text-lg font-semibold leading-tight text-neutral-900">{capability.title}</p>
              <p className={cn("mt-1 text-sm leading-snug", capability.featured ? "text-hk-700" : "text-neutral-500")}>
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
              <p className="text-4xl font-semibold tracking-[-0.04em] text-neutral-950">366 jours</p>
              <p className="mt-1 text-sm text-neutral-500">de calendrier consultable</p>
            </div>
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-neutral-950">5 min</p>
              <p className="mt-1 text-sm text-neutral-500">de validité des liens photos</p>
            </div>
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-neutral-950">0</p>
              <p className="mt-1 text-sm text-neutral-500">coordonnée voyageur exposée</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1450}>
          <Chip className="border-hk-500/20 bg-hk-50 px-4 py-2 text-sm text-hk-700">
            La transparence n’est plus une promesse, c’est une API.
          </Chip>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

function MoneySlide() {
  return (
    <SlideFrame className="bg-white">
      <Glow className="left-[-220px] top-[160px] h-[540px] w-[700px]" />
      <SlideHeader kicker="L’argent" className="text-[48px]">
        Votre reversement part à J+1.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-8">
        <div className="flex min-w-0 flex-col">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
            <Reveal delay={400}>
              <Panel className="p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">Montant</p>
                <p className="mt-2 text-2xl font-semibold">réellement encaissé</p>
              </Panel>
            </Reveal>
            <Reveal delay={550}>
              <span className="text-4xl font-semibold text-neutral-300">−</span>
            </Reveal>
            <Reveal delay={650}>
              <Panel className="p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">Frais Stripe</p>
                <p className="mt-2 text-2xl font-semibold">réels</p>
              </Panel>
            </Reveal>
            <Reveal delay={750}>
              <span className="text-4xl font-semibold text-neutral-300">=</span>
            </Reveal>
            <Reveal delay={850}>
              <Panel className="border-hk-500/25 bg-hk-50 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-hk-700">Reversement</p>
                <p className="mt-2 text-2xl font-semibold">propriétaire</p>
              </Panel>
            </Reveal>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Reveal delay={1000}>
              <Panel className="p-5">
                <p className="text-lg font-semibold">Jamais deux fois le même virement</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Verrou, groupe de transfert unique et rapprochement Stripe.
                </p>
              </Panel>
            </Reveal>
            <Reveal delay={1120}>
              <Panel className="p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-hk-600" aria-hidden />
                  <p className="text-lg font-semibold">Blocage automatique</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Litige · remboursement · annulation.</p>
              </Panel>
            </Reveal>
          </div>

          <Reveal delay={1250}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Chip>Départ du voyageur</Chip>
              <ArrowRight className="h-4 w-4 text-hk-600" aria-hidden />
              <Chip>J+1</Chip>
              <ArrowRight className="h-4 w-4 text-hk-600" aria-hidden />
              <Chip>Virement Stripe Connect</Chip>
              <Chip>
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-600" aria-hidden />
                cycle de 15 min
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1380}>
            <TechNote className="mt-4">Frais lus sur balance_transaction · cautions exclues</TechNote>
          </Reveal>
        </div>

        <Reveal delay={650} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center border-hk-500/25 bg-hk-50 p-7 text-center">
            <BigFigure value="J+1" caption="après le départ" className="text-[84px]" />
            <div className="my-7 h-px w-full bg-black/[0.06]" />
            <BigFigure value="0 €" caption="de commission cachée" className="text-[84px]" />
            <p className="mt-6 text-sm text-neutral-400 line-through">Commission de gestion</p>
            <p className="mt-2 text-sm text-neutral-400 line-through">Cautions incluses</p>
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
    text: "Seule leur empreinte SHA-256 est stockée, jamais dans le navigateur.",
  },
  {
    icon: Lock,
    title: "Secrets au coffre",
    text: "Supabase Vault : jamais affichés, jamais journalisés.",
  },
  {
    icon: ShieldCheck,
    title: "Accès contrôlé",
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
      <SlideHeader kicker="La confiance" className="text-[46px]">
        Vous voyez tout. Sans exposer les voyageurs.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_310px] gap-8">
        <div className="grid grid-cols-2 gap-4">
          {trustItems.map((item, index) => (
            <Reveal key={item.title} delay={400 + index * 120}>
              <Panel className="h-[128px] p-4">
                <div className="flex items-center gap-3">
                  <IconBadge icon={item.icon} />
                  <p className="text-lg font-semibold text-neutral-900">{item.title}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{item.text}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
        <Reveal delay={950} className="h-full">
          <Panel className="flex h-full flex-col items-center justify-center p-8 text-center">
            <BigFigure value="0" caption="coordonnée voyageur exposée au propriétaire" />
            <div className="mt-8 rounded-full border border-black/[0.06] bg-[#f5f5f7] px-4 py-2 text-sm text-neutral-500">
              Vous ne voyez que vos logements.
            </div>
          </Panel>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

function ClosingSlide() {
  return (
    <SlideFrame className="items-center justify-center bg-white px-20 text-center">
      <Glow className="left-1/2 top-1/2 h-[620px] w-[980px] -translate-x-1/2 -translate-y-1/2" />
      <Reveal>
        <div className="flex items-center justify-center gap-3">
          <Chip>{"< 5 min"}</Chip>
          <Chip>J+1</Chip>
          <Chip>0 €</Chip>
        </div>
      </Reveal>
      <Reveal delay={350}>
        <h2 className="mt-9 max-w-6xl text-balance text-[64px] font-semibold leading-[1.03] tracking-[-0.055em]">
          La confiance n’est plus déclarée :
          <br />
          <span className="bg-gradient-to-r from-neutral-950 to-hk-600 bg-clip-text text-transparent">elle est affichée.</span>
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mt-9 text-[24px] font-medium text-neutral-600">
          Hello Keys gère avec Cadence. Vous suivez tout depuis votre espace.
        </p>
      </Reveal>
      <Reveal delay={1050}>
        <div className="mt-8 inline-flex items-center rounded-full bg-hk-500 px-6 py-3 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(0,113,227,0.22)]">
          Explorez votre espace propriétaire
        </div>
      </Reveal>
      <Reveal delay={1200}>
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
      "Bonjour à toutes et à tous. Vous confiez votre logement à Hello Keys. Vous voulez savoir ce qui s’y passe, sans avoir à appeler, ni à attendre un relevé. C’est exactement le sujet de cette présentation.",
      "Hello Keys a développé Cadence, sa plateforme interne de gestion locative. Cadence orchestre les annonces, les réservations, les messages, les cautions et les reversements. Elle travaille en arrière-plan pour l’équipe Hello Keys, et elle alimente votre espace propriétaire.",
      "Aujourd’hui, nous allons vous montrer ce que cela change concrètement pour vous : une gestion plus rapide, des preuves visibles et une information disponible sans intermédiaire.",
      "Cadence, par Hello Keys. Votre location, en toute confiance.",
    ],
    transition: "Avant de montrer la solution, partons de ce que vous pouviez vivre jusqu’ici.",
  },
  {
    id: "constat",
    label: "Le constat propriétaire",
    Component: ProblemSlide,
    notes: [
      "Avant, la relation passait souvent par une question. Est-ce que mon logement est loué ? Le ménage est-il vraiment terminé ? Quand mon reversement partira-t-il ? Combien mon bien a-t-il généré ce mois-ci ?",
      "Ces questions sont normales. Vous confiez un bien important. Mais lorsque la réponse dépend d’un appel, d’un message ou d’un relevé mensuel, l’information arrive trop tard. Vous attendez. L’équipe cherche. Puis elle vous répond.",
      "Le problème n’est pas un manque de confiance. C’est un manque d’accès direct à l’information. Nous avons donc construit une réponse simple : remplacer la demande par l’affichage, et la déclaration par la preuve.",
      "C’est précisément pour cela que Hello Keys a développé Cadence.",
    ],
    transition: "Voici maintenant la plateforme qui porte cette ambition.",
  },
  {
    id: "cadence",
    label: "Cadence par Hello Keys",
    Component: PromiseSlide,
    notes: [
      "Cadence est la plateforme interne développée par Hello Keys. Elle n’est pas un logiciel figé : elle est enrichie en continu, au fil des besoins de gestion et des retours du terrain.",
      "Cadence est connectée en profondeur à NextPax, le channel manager certifié qui fait le lien avec les plateformes de réservation. Pour vous, l’image est simple : une action décidée dans Cadence peut être transmise aux plateformes, sans ressaisie plateforme par plateforme.",
      "Cadence pilote aussi les paiements avec Stripe, la tarification dynamique avec Beyond, les messages voyageurs, les avis et les sauvegardes. Surtout, elle alimente votre espace propriétaire grâce à une API privée et sécurisée.",
      "Le résultat pour vous : moins d’attente, une gestion plus réactive et une information que vous pouvez consulter directement.",
    ],
    transition: "Commençons par un cas très concret : une période creuse à remplir.",
  },
  {
    id: "promotion",
    label: "Promotion rapide",
    Component: PromotionSlide,
    notes: [
      "Quand une période creuse apparaît, la vitesse compte. Avec Cadence, l’équipe Hello Keys ouvre la page Promotions, choisit le canal, puis le type d’offre. Cinq canaux sont disponibles : Booking.com, Airbnb, Expedia, Vrbo et Marriott.",
      "Les règles affichées ne sont pas recopiées à la main. Cadence les lit en direct chez NextPax : dernière minute avec seuil en heures, réservation anticipée, dates de séjour. L’équipe saisit la remise et valide.",
      "Cadence appelle ensuite l’API Promotions de NextPax. Une API, c’est un guichet entre deux logiciels : Cadence dépose l’offre, NextPax la distribue aux plateformes concernées. Aucune ressaisie.",
      "Ce qui pouvait prendre un échange et de l’attente prend moins de cinq minutes. Pour vous, cela signifie une réaction plus rapide lorsqu’un créneau doit être travaillé.",
    ],
    transition: "Une offre attire le regard. Mais ce que le voyageur voit d’abord, c’est votre première photo.",
  },
  {
    id: "photos",
    label: "Photos des annonces",
    Component: PhotosSlide,
    notes: [
      "La première photo vend le séjour. Avec Cadence, l’équipe Hello Keys pilote directement l’ordre des photos de votre annonce : glisser, déposer, choisir la photo principale. Un geste simple, mais décisif.",
      "Chaque photo peut être étiquetée avec son type : chambre, salle de bain, vue. À l’enregistrement, l’ordre choisi devient la priorité d’affichage transmise à NextPax. Autrement dit, l’ordre préparé dans Cadence est l’ordre diffusé sur les annonces.",
      "La chaîne est complète : téléversement en masse, miroir sécurisé des images, page de contrôle de synchronisation par logement et export CSV.",
      "Pour vous, cela veut dire une annonce plus soignée, mise à jour sans friction, avec la meilleure image en premier.",
    ],
    transition: "L’annonce est belle et visible. Le voyageur écrit maintenant : il faut répondre vite et au bon endroit.",
  },
  {
    id: "messages",
    label: "Messages voyageurs",
    Component: MessagesSlide,
    notes: [
      "Les voyageurs écrivent depuis plusieurs plateformes. Cadence rassemble leurs conversations dans une seule boîte de réception : dernier message, badge non lu, historique complet à l’ouverture, réponse relayée vers le bon canal.",
      "Il y a aussi un détail invisible mais important. Pour qu’un message parte correctement vers Airbnb, NextPax doit connaître l’identifiant hôte de chaque annonce. S’il en manque un, NextPax peut répondre « bien reçu » sans que le message soit réellement relayé. Aucune erreur visible.",
      "Cadence corrige cela automatiquement : une fois par jour, elle rassemble tous les identifiants hôte des annonces et met la configuration à jour.",
      "Ajoutez les messages automatiques déclenchés par les événements de réservation et les notifications push. La relation voyageur est mieux suivie, sans multiplier les applications.",
    ],
    transition: "Cette réactivité fonctionne aussi à plus grande échelle, lorsqu’il faut diffuser un logement sur plusieurs canaux.",
  },
  {
    id: "diffusion",
    label: "Diffusion multi-canal",
    Component: MultichannelSlide,
    notes: [
      "Mettre un logement en ligne sur plusieurs plateformes peut vite devenir répétitif. Cadence permet d’activer Airbnb, Booking et Abritel ensemble.",
      "Le traitement se fait par lots de vingt logements, avec trois connexions en parallèle. Ensuite, Cadence relit automatiquement les statuts toutes les vingt secondes, jusqu’au verdict. Le délai observé est d’environ trois minutes.",
      "Si une plateforme refuse une annonce, Cadence ne se contente pas d’un code technique. L’erreur est traduite en français actionnable, pour que l’équipe sache quoi corriger.",
      "Pour vous, la diffusion devient plus rapide et plus lisible. Votre logement peut être présent sur les canaux importants sans journées de clics.",
    ],
    transition: "Tout cela repose sur une machine discrète. Regardons-la une minute, sans jargon.",
  },
  {
    id: "architecture",
    label: "Sous le capot",
    Component: ArchitectureSlide,
    notes: [
      "Cadence travaille en arrière-plan. Au centre, il y a environ quatre-vingt-quinze Edge Functions. Imaginez de petits automates serverless : chacun a une mission, et ne se réveille que lorsqu’il est nécessaire.",
      "Toutes les quelques minutes, l’un relève les nouvelles réservations. Toutes les quinze minutes, d’autres traitent les cautions du jour J et les reversements à J+1. Chaque nuit, une sauvegarde s’exécute.",
      "Autour de cette machine, Cadence communique avec NextPax pour les plateformes, Stripe pour l’argent, Beyond pour la tarification dynamique, Resend pour les e-mails, et avec le moteur de tarification météo développé par Hello Keys.",
      "Les secrets sont conservés dans un coffre, Supabase Vault. Les données sont cloisonnées par RLS : un vigile vérifie chaque ligne avant de la laisser lire.",
      "La machine avance, même lorsque vous ne la regardez pas.",
    ],
    transition: "Cadence travaille pour Hello Keys. La suite vous concerne directement : votre espace propriétaire.",
  },
  {
    id: "transition",
    label: "Vous voyez",
    Component: TransitionSlide,
    notes: [
      "Jusqu’ici, nous avons vu Cadence au service de l’équipe Hello Keys : promotions, photos, messages, diffusion. Mais l’autonomie de l’équipe ne suffit pas. Il faut aussi que vous, propriétaire, soyez informé sans dépendre d’un appel ou d’un message.",
      "C’est le rôle de votre espace propriétaire. Il est séparé de Cadence, mais alimenté par son API privée et sécurisée. Chaque propriétaire ne voit que les logements attribués à son profil.",
      "Le principe est simple : Cadence gère, vous voyez. Vous n’appelez plus pour demander une nouvelle : elle est déjà là.",
    ],
    transition: "Voici les sept capacités de votre espace.",
  },
  {
    id: "espace-proprietaire",
    label: "Espace propriétaire",
    Component: OwnerPortalSlide,
    notes: [
      "Votre espace propriétaire rassemble sept capacités. Vos réservations : dates, statut, canal, référence et montant du séjour, sans jamais exposer les coordonnées des voyageurs. Vos prix et disponibilités : jour par jour, jusqu’à trois cent soixante-six jours.",
      "Vos dates personnelles : vous pouvez les bloquer, avec ou sans demande de ménage. Vos ménages : interventions, statuts, pièces et photos avant et après. Tous vos avis, sans exception. Une alerte à chaque réservation, modification ou annulation. Et enfin, votre reversement automatique.",
      "Chaque euro encaissé, chaque ménage photographié, chaque avis — visible en direct.",
      "La transparence n’est plus une promesse, c’est une API.",
    ],
    transition: "Six de ces capacités vous informent. La septième concerne votre argent.",
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
    label: "Reversement propriétaire",
    Component: MoneySlide,
    notes: [
      "Parlons d’argent, car c’est là que la confiance se gagne ou se perd.",
      "Le lendemain du départ du voyageur, votre reversement part. Automatiquement. Toutes les quinze minutes, un automate repère les séjours arrivés à J+1 et lance les virements via Stripe Connect, le circuit qui relie Stripe à votre compte.",
      "Le montant est simple à expliquer : le total réellement encaissé, moins uniquement les frais Stripe réels. Cadence ne fait pas d’estimation : il lit ces frais sur la ligne de relevé Stripe elle-même. Zéro commission de gestion. Les cautions sont exclues du calcul.",
      "Deux protections complètent le dispositif. L’idempotence empêche de verser deux fois la même chose, même si l’opération est relancée. Et en cas de litige, de remboursement ou d’annulation, le reversement se bloque automatiquement.",
      "Zéro euro de commission cachée.",
    ],
    transition: "Une telle visibilité n’a de valeur que si les accès sont strictement protégés.",
  },
  {
    id: "confiance",
    label: "Sécurité et confidentialité",
    Component: TrustSlide,
    notes: [
      "Tout montrer ne veut pas dire tout exposer. Les clés d’accès sont révocables, et Cadence n’en conserve que le hash, c’est-à-dire leur empreinte digitale. On peut reconnaître la clé, pas la refabriquer.",
      "Les secrets sont conservés dans Supabase Vault, un coffre-fort. Ils ne sont jamais affichés ni écrits dans les journaux techniques. Avant chaque appel, Cadence vérifie le badge de l’utilisateur, puis que le logement demandé est bien attribué à son profil.",
      "Un quota de cent vingt appels par minute et par clé protège l’ensemble. Les actions sensibles sont réservées au titulaire du compte, pas aux collaborateurs. L’identité et les coordonnées bancaires sont vérifiées par Stripe, et le bénéficiaire est figé au moment du paiement.",
      "Et surtout : zéro coordonnée voyageur n’est exposée au propriétaire.",
    ],
    transition: "Il reste une phrase pour résumer cette approche.",
  },
  {
    id: "conclusion",
    label: "Conclusion",
    Component: ClosingSlide,
    notes: [
      "Revenons à vos questions de départ. Est-ce loué ? Vous le voyez. Le ménage est-il fait ? Les photos le montrent. Qu’ont pensé les voyageurs ? Les avis sont là. Quand part votre reversement ? À J+1 du départ.",
      "Pendant ce temps, Cadence aide Hello Keys à gérer plus vite : promotions, photos, messages, diffusion, cautions, reversements et sauvegardes.",
      "C’est cela que nous avons voulu construire : une gestion plus réactive côté Hello Keys, et une information plus claire côté propriétaire. Vous n’avez plus besoin de demander pour savoir.",
      "Hello Keys gère avec Cadence. Vous suivez tout depuis votre espace.",
      "La confiance n’est plus déclarée : elle est affichée. Merci.",
    ],
    transition: "Fin de la keynote. Laisser le slogan à l’écran pendant les questions.",
  },
];
