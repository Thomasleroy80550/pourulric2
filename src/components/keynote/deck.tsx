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
  Image as ImageIcon,
  Images,
  KeyRound,
  Landmark,
  Lock,
  Megaphone,
  MessageSquare,
  PhoneCall,
  Plus,
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
  Wordmark,
} from "./kit";
import { investmentSlides } from "./investmentSection";
import { remainingConnectionsSlide } from "./remainingConnections";
import type { KeynoteSlide } from "./types";
import { cn } from "@/lib/utils";

function FlowArrow({ label, delay = 0 }: { label?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="keynote-flow-arrow flex flex-col items-center gap-2 text-hk-600">
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
  "Choisissez le canal de diffusion",
  "Sélectionnez le type d’offre",
  "Définissez votre remise",
  "Publiez sans attendre une validation Hello Keys",
];

function PromotionSlide() {
  return (
    <SlideFrame>
      <Glow className="left-[-220px] top-[220px] h-[520px] w-[640px]" />
      <SlideHeader kicker="Autonomie" className="text-[46px]">
        Créez vos promotions vous-même.
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
            <p className="text-center text-sm leading-relaxed text-neutral-500">
              Vous lancez l’offre au bon moment, même un dimanche soir.
            </p>
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

function PhotoGrid({
  title,
  delay,
  editable,
  pending,
}: {
  title: string;
  delay: number;
  editable?: boolean;
  pending?: boolean;
}) {
  return (
    <Reveal delay={delay} className="w-[330px] shrink-0">
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">{title}</p>
          {editable && (
            <Chip className="px-2 py-1 text-[11px] text-hk-700">
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              Ajouter
            </Chip>
          )}
          {pending && (
            <Chip className="border-orange-500/20 bg-orange-50 px-2 py-1 text-[11px] text-orange-700">
              À connecter
            </Chip>
          )}
        </div>
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
      <SlideHeader kicker="À connecter" className="text-[46px]">
        Bientôt : vos photos, sous votre contrôle.
      </SlideHeader>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-8">
        <Bullets
          className="mt-3 text-[19px]"
          items={[
            "Vous pourrez voir toutes les photos de votre logement",
            "Ajouter de nouvelles photos",
            "Modifier leurs étiquettes : chambre, salle de bain, vue…",
            "Changer leur ordre par glisser-déposer",
            "Répercuter vos choix sur les annonces",
          ]}
        />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="keynote-flow flex items-center justify-center gap-5">
            <PhotoGrid title="Dans Cadence" delay={450} editable />
            <FlowArrow label="Connexion" delay={850} />
            <PhotoGrid title="Votre espace" delay={1050} pending />
          </div>
          <Reveal delay={1250}>
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-neutral-500">
              <Upload className="h-4 w-4 text-hk-600" aria-hidden />
              Cadence sait déjà gérer les photos, les étiquettes et l’ordre.
            </div>
          </Reveal>
          <Reveal delay={1400}>
            <p className="mt-2 text-center text-sm leading-relaxed text-neutral-500">
              La prochaine étape : connecter cette gestion à votre espace.
            </p>
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
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Chip>Boîte unique</Chip>
              <Chip>Réponse relayée au bon canal</Chip>
              <Chip className="border-emerald-500/20 bg-emerald-50 text-emerald-700">
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Configuration vérifiée chaque jour
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1100}>
            <p className="mt-3 text-center text-sm leading-relaxed text-neutral-500">
              Avantage : une relation voyageur plus fluide, sans multiplier les applications.
            </p>
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
              "Airbnb, Booking et Abritel peuvent être activés ensemble",
              "Le statut de diffusion est suivi automatiquement",
              "Le verdict est observé en environ 3 minutes",
              "Les erreurs sont expliquées clairement",
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
              <Chip>Activation simultanée</Chip>
              <Chip>Suivi automatique</Chip>
              <Chip>
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-600" aria-hidden />
                Verdict en ~3 min
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1050}>
            <p className="mt-4 text-center text-sm leading-relaxed text-neutral-500">
              Avantage : votre logement est diffusé plus vite, avec moins de manipulations.
            </p>
          </Reveal>
        </div>
      </div>
    </SlideFrame>
  );
}

const automationCards = [
  {
    icon: CalendarDays,
    title: "Réservations",
    text: "Les nouvelles réservations sont relevées automatiquement.",
  },
  {
    icon: ShieldCheck,
    title: "Cautions",
    text: "Les cautions sont traitées au bon moment.",
  },
  {
    icon: Banknote,
    title: "Reversements",
    text: "Le reversement part à J+1 du départ.",
  },
  {
    icon: CloudSun,
    title: "Tarification",
    text: "Beyond et la météo aident à ajuster les prix.",
  },
  {
    icon: MessageSquare,
    title: "Messages",
    text: "Les conversations et envois automatiques sont suivis.",
  },
  {
    icon: Database,
    title: "Sauvegardes",
    text: "Les données sont sauvegardées chaque nuit.",
  },
];

function ArchitectureSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-180px] top-[-140px] h-[520px] w-[680px]" />
      <SlideHeader kicker="En arrière-plan" className="text-[46px]">
        Cadence automatise le suivi quotidien.
      </SlideHeader>
      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_330px] gap-8">
        <div className="grid grid-cols-2 gap-4">
          {automationCards.map((item, index) => (
            <Reveal key={item.title} delay={400 + index * 120}>
              <Panel className="h-[132px] p-5">
                <div className="flex items-center gap-3">
                  <IconBadge icon={item.icon} />
                  <p className="text-xl font-semibold text-neutral-900">{item.title}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{item.text}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
        <Reveal delay={900} className="h-full">
          <Panel className="flex h-full flex-col justify-center p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Ce que vous y gagnez</p>
            <div className="mt-7 space-y-5">
              {[
                "Moins de tâches manuelles",
                "Des actions lancées au bon moment",
                "Une information à jour dans votre espace",
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-lg font-medium leading-snug text-neutral-800">{benefit}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>
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
    status: "available" as const,
  },
  {
    icon: Gauge,
    title: "Gestion des prix",
    text: "Prix et disponibilités, jour par jour",
    status: "connect" as const,
  },
  {
    icon: Lock,
    title: "Blocages",
    text: "Vos dates perso, avec ou sans ménage",
    status: "connect" as const,
  },
  {
    icon: Camera,
    title: "Ménage",
    text: "Photos avant / après",
    status: "connect" as const,
  },
  {
    icon: Star,
    title: "Avis voyageurs",
    text: "Tous les avis de vos logements",
    status: "connect" as const,
  },
  {
    icon: BellRing,
    title: "Alertes instantanées",
    text: "Réservation, modification, annulation",
    status: "available" as const,
  },
  {
    icon: Banknote,
    title: "Payé automatiquement",
    text: "Reversement à J+1 du départ",
    status: "available" as const,
    featured: true,
  },
];

function OwnerPortalSlide() {
  return (
    <SlideFrame>
      <Glow className="right-[-200px] top-[140px] h-[520px] w-[700px]" />
      <SlideHeader kicker="Votre espace propriétaire" className="text-[42px]">
        Disponible aujourd’hui. Connecté progressivement.
      </SlideHeader>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {ownerCapabilities.map((capability, index) => (
          <Reveal key={capability.title} delay={350 + index * 130} className={cn(capability.featured && "col-span-2")}>
            <Panel
              className={cn(
                "h-[148px] p-4",
                capability.featured && "border-hk-500/25 bg-hk-50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={capability.icon} muted={!capability.featured} />
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-semibold",
                    capability.status === "available"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-700",
                  )}
                >
                  {capability.status === "available" ? "Disponible" : "À connecter"}
                </span>
              </div>
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
          <div className="keynote-flow flex items-start gap-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Déjà dans votre espace</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                Réservations · Alertes · Reversement
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Connexion priorisée</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                Avis · Ménage · Blocages · Prix · Photos
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1450}>
          <Chip className="border-hk-500/20 bg-hk-50 px-4 py-2 text-sm text-hk-700">
            La transparence n’est plus une promesse : elle est affichée.
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
              <Chip>Virement vers votre compte</Chip>
              <Chip>
                <Clock3 className="mr-1.5 h-3.5 w-3.5 text-hk-600" aria-hidden />
                contrôle régulier
              </Chip>
            </div>
          </Reveal>
          <Reveal delay={1380}>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Le calcul est lisible : montant encaissé, frais Stripe réels, reversement.
            </p>
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
    icon: Lock,
    title: "Vos logements uniquement",
    text: "Vous ne voyez que les biens attribués à votre profil.",
  },
  {
    icon: Camera,
    title: "Photos protégées",
    text: "Les liens des photos de ménage expirent après 5 minutes.",
  },
  {
    icon: BadgeCheck,
    title: "Actions réservées",
    text: "Les actions sensibles restent réservées au titulaire du compte.",
  },
  {
    icon: Landmark,
    title: "Banque vérifiée",
    text: "Stripe vérifie l’identité et les coordonnées bancaires.",
  },
  {
    icon: KeyRound,
    title: "Accès révocables",
    text: "Les clés d’accès peuvent être désactivées si nécessaire.",
  },
  {
    icon: ShieldCheck,
    title: "Données séparées",
    text: "Chaque compte est strictement cloisonné.",
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
          Hello Keys gère avec Cadence. Vous voyez l’essentiel, et la suite se connecte.
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
      "Cadence est la plateforme développée par Hello Keys. Elle n’est pas figée : elle est enrichie en continu, à partir des besoins de gestion et des retours du terrain.",
      "Vous n’avez pas besoin de connaître la mécanique interne. Ce qu’il faut retenir est simple : Cadence relie votre espace propriétaire aux plateformes de réservation, aux paiements et aux outils de tarification.",
      "Cette base permet deux choses. D’un côté, Hello Keys automatise les tâches répétitives. De l’autre, vous recevez une information plus claire et vous pouvez agir vous-même sur de plus en plus de sujets.",
      "Le résultat pour vous : moins d’attente, plus de visibilité, et davantage de contrôle sur votre location.",
    ],
    transition: "Commençons par un cas très concret : une période creuse à remplir.",
  },
  {
    id: "promotion",
    label: "Promotion rapide",
    Component: PromotionSlide,
    notes: [
      "Quand une période creuse apparaît, vous pouvez agir immédiatement. Depuis votre espace, vous ouvrez Promotions, vous choisissez le canal, le type d’offre et la remise, puis vous publiez. Vous n’avez pas besoin d’attendre une validation de Hello Keys.",
      "Cinq canaux sont disponibles : Booking.com, Airbnb, Expedia, Vrbo et Marriott. Les types d’offre proposés correspondent aux règles réelles de chaque plateforme : dernière minute, réservation anticipée, dates de séjour.",
      "Une fois validée, l’offre est envoyée aux plateformes concernées. Vous n’avez rien à recopier d’un site à l’autre. Vous pouvez ensuite la modifier, l’activer ou la mettre en pause.",
      "L’avantage est simple : vous réagissez au bon moment, même un dimanche soir, et vous gardez la main sur votre stratégie commerciale.",
    ],
    transition: "Une offre attire le regard. Mais ce que le voyageur voit d’abord, c’est votre première photo.",
  },
  {
    id: "photos",
    label: "Photos des annonces",
    Component: PhotosSlide,
    notes: [
      "Cadence sait déjà gérer les photos des annonces : voir les images, en ajouter, modifier leurs étiquettes et changer leur ordre.",
      "La première photo est choisie en un clic. Les autres se réorganisent par glisser-déposer. Vous pouvez indiquer ce que montre chaque image : chambre, salle de bain, vue, cuisine.",
      "Ce qui reste à faire, c’est la connexion de cette gestion à votre espace propriétaire. L’objectif est simple : vous pourrez préparer votre sélection, et vos choix seront répercutés sur les annonces.",
      "L’avantage est direct : votre annonce restera à jour, plus claire et plus attractive, sans échange ni délai.",
    ],
    transition: "L’annonce est belle et visible. Le voyageur écrit maintenant : il faut répondre vite et au bon endroit.",
  },
  {
    id: "messages",
    label: "Messages voyageurs",
    Component: MessagesSlide,
    notes: [
      "Les voyageurs écrivent depuis plusieurs plateformes. Cadence rassemble leurs conversations dans une seule boîte de réception : dernier message, messages non lus, historique complet et réponse envoyée sur le bon canal.",
      "Des messages automatiques peuvent aussi être déclenchés pendant le séjour, par exemple lorsqu’une réservation est créée, modifiée ou annulée. L’équipe Hello Keys garde donc une vue claire de la relation voyageur.",
      "Cadence vérifie aussi chaque jour que la configuration est complète, pour éviter qu’un message soit accepté par une plateforme sans être réellement transmis.",
      "L’avantage pour vous : les voyageurs sont mieux suivis, les réponses sont plus fluides et le risque de message perdu diminue.",
    ],
    transition: "Cette réactivité fonctionne aussi à plus grande échelle, lorsqu’il faut diffuser un logement sur plusieurs canaux.",
  },
  {
    id: "diffusion",
    label: "Diffusion multi-canal",
    Component: MultichannelSlide,
    notes: [
      "Mettre un logement en ligne sur plusieurs plateformes peut vite devenir répétitif. Cadence permet d’activer Airbnb, Booking et Abritel ensemble.",
      "Ensuite, le statut de diffusion est suivi automatiquement. Le verdict arrive en quelques minutes, avec un délai observé d’environ trois minutes.",
      "Si une plateforme refuse une annonce, la raison est expliquée clairement. L’équipe sait ainsi quoi corriger, sans chercher à décoder un message technique.",
      "L’avantage pour vous : votre logement est diffusé plus vite, avec moins de manipulations et une meilleure visibilité sur l’état d’avancement.",
    ],
    transition: "Tout cela repose sur une machine discrète. Regardons ce qu’elle automatise, sans entrer dans la technique.",
  },
  {
    id: "architecture",
    label: "Sous le capot",
    Component: ArchitectureSlide,
    notes: [
      "Cadence travaille en arrière-plan. Inutile de retenir la technique : imaginez de petits automates, chacun chargé d’une tâche précise.",
      "Les nouvelles réservations sont relevées automatiquement. Les cautions sont traitées au bon moment. Les reversements partent à J+1 du départ. Les données sont sauvegardées chaque nuit.",
      "Cadence est aussi connecté aux plateformes de réservation, à Stripe pour les paiements, à Beyond et à la tarification météo pour ajuster les prix.",
      "L’avantage est concret : moins de tâches manuelles, des actions lancées au bon moment, et une information à jour dans votre espace propriétaire.",
      "La machine avance, même lorsque vous ne la regardez pas.",
    ],
    transition: "Avant d’ouvrir votre espace propriétaire, regardons ce que représente réellement cette plateforme.",
  },
  ...investmentSlides,
  {
    id: "transition",
    label: "Vous voyez",
    Component: TransitionSlide,
    notes: [
      "Jusqu’ici, nous avons vu comment Cadence aide Hello Keys à mieux gérer : promotions, photos, messages et diffusion. Mais la gestion efficace ne suffit pas. Vous devez aussi pouvoir suivre ce qui se passe, sans dépendre d’un appel ou d’un message.",
      "C’est le rôle de votre espace propriétaire. Il vous donne accès aux informations de vos logements, et uniquement à celles-ci.",
      "Le principe est simple : Cadence gère, vous voyez. Vous n’appelez plus pour demander une nouvelle : elle est déjà là.",
    ],
    transition: "Voici ce qui est disponible dans votre espace, et ce qui reste à connecter.",
  },
  {
    id: "espace-proprietaire",
    label: "Espace propriétaire",
    Component: OwnerPortalSlide,
    notes: [
      "Votre espace propriétaire vous donne déjà accès aux réservations, aux alertes et au reversement. C’est la première étape de la transparence.",
      "Les autres blocs sont connectés progressivement. Nous avons priorisé les avis, le ménage, les blocages, la gestion des prix et la gestion des photos des annonces.",
      "L’objectif n’est pas de vous montrer de la technique. L’objectif est de vous éviter des questions : vous savez ce qui est réservé, ce qui est fait et ce qui vous sera versé.",
      "La transparence n’est plus une promesse : elle est affichée.",
    ],
    transition: "Avant de parler argent, voyons ce qui est déjà disponible et ce qui reste à connecter.",
    cheatSheet: [
      {
        capacity: "Réservations",
        source: "Disponible",
        say: "Dates, statut, canal, référence et montant du séjour. Ni coordonnées voyageurs, ni données de paiement.",
      },
      {
        capacity: "Gestion des prix",
        source: "À connecter",
        say: "La gestion des prix et des disponibilités fait partie des blocs priorisés.",
      },
      {
        capacity: "Blocages",
        source: "À connecter",
        say: "Les dates personnelles pourront être bloquées depuis votre espace, avec ou sans demande de ménage.",
      },
      {
        capacity: "Ménage",
        source: "À connecter",
        say: "Les interventions et les photos avant / après feront partie des blocs priorisés.",
      },
      {
        capacity: "Avis",
        source: "À connecter",
        say: "Tous les avis voyageurs seront consultables depuis votre espace.",
      },
      {
        capacity: "Alertes",
        source: "Disponible",
        say: "Vous êtes informé à chaque réservation, modification ou annulation.",
      },
      {
        capacity: "Paiement",
        source: "Disponible",
        say: "Le reversement part automatiquement à J+1 du départ, détaillé sur la slide suivante.",
      },
    ],
  },
  {
    id: "argent",
    label: "Reversement propriétaire",
    Component: MoneySlide,
    notes: [
      "Parlons d’argent, car c’est là que la confiance se gagne ou se perd.",
      "Le lendemain du départ du voyageur, votre reversement part automatiquement. Cadence vérifie régulièrement les séjours arrivés à J+1, puis lance le virement.",
      "Le montant est simple à lire : le total réellement encaissé, moins uniquement les frais Stripe réels. Zéro commission de gestion. Les cautions sont exclues du calcul.",
      "Un même virement ne peut pas partir deux fois. Et en cas de litige, de remboursement ou d’annulation, le reversement se bloque automatiquement.",
      "Zéro euro de commission cachée.",
    ],
    transition: "Une telle visibilité n’a de valeur que si les accès sont strictement protégés.",
  },
  {
    id: "confiance",
    label: "Sécurité et confidentialité",
    Component: TrustSlide,
    notes: [
      "Tout montrer ne veut pas dire tout exposer. Vous voyez les informations de vos logements, et uniquement celles-ci.",
      "Les accès peuvent être révoqués si nécessaire. Les actions sensibles sont réservées au titulaire du compte. Les liens des photos de ménage expirent après cinq minutes.",
      "Pour les paiements, l’identité et les coordonnées bancaires sont vérifiées par Stripe. Le bénéficiaire est figé au moment du paiement.",
      "Et surtout : zéro coordonnée voyageur n’est exposée au propriétaire. Vous avez la visibilité, sans compromettre la confidentialité.",
    ],
    transition: "Avant de conclure, regardons précisément ce qui reste à connecter à votre espace.",
  },
  remainingConnectionsSlide,
  {
    id: "conclusion",
    label: "Conclusion",
    Component: ClosingSlide,
    notes: [
      "Revenons à vos questions de départ. Est-ce loué ? Vous le voyez. Quand part votre reversement ? À J+1 du départ. Une réservation change ? Vous êtes alerté.",
      "Pendant ce temps, Cadence fait déjà fonctionner les opérations : promotions, photos, messages, diffusion, cautions, reversements et sauvegardes. La prochaine étape est de connecter les blocs prioritaires à votre espace.",
      "C’est cela que nous avons voulu construire : une gestion plus réactive côté Hello Keys, et une information plus claire côté propriétaire. Vous savez ce qui est disponible, et ce qui arrive.",
      "Hello Keys gère avec Cadence. Vous voyez l’essentiel, et la suite se connecte.",
      "La confiance n’est plus déclarée : elle est affichée. Merci.",
    ],
    transition: "Fin de la keynote. Laisser le slogan à l’écran pendant les questions.",
  },
];
