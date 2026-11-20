import { Camera, Gauge, Images, Lock, Star } from "lucide-react";
import { Chip, Glow, IconBadge, Panel, Reveal, SlideFrame, SlideHeader } from "./kit";
import type { KeynoteSlide } from "./types";

const remainingConnections = [
  { icon: Star, title: "Les avis" },
  { icon: Camera, title: "Le ménage" },
  { icon: Lock, title: "Les blocages" },
  { icon: Gauge, title: "La gestion des prix" },
  { icon: Images, title: "Les photos des annonces" },
];

function RemainingConnectionsSlide() {
  return (
    <SlideFrame className="bg-white">
      <Glow className="right-[-180px] top-[-160px] h-[520px] w-[720px]" />
      <SlideHeader kicker="La suite" className="text-[44px]">
        Ce qu’il reste à connecter à votre espace.
      </SlideHeader>

      <Reveal delay={350}>
        <Panel className="mt-7 border-hk-500/20 bg-hk-50 p-5">
          <p className="text-[22px] font-semibold leading-snug text-neutral-950">
            La migration a servi à migrer la connectivité.
          </p>
          <p className="mt-1 text-[20px] leading-snug text-neutral-600">
            Aujourd’hui, tout fonctionne dans Cadence.
          </p>
        </Panel>
      </Reveal>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {remainingConnections.map((item, index) => (
          <Reveal key={item.title} delay={550 + index * 140}>
            <Panel className="flex h-[190px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={item.icon} />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] text-sm font-semibold text-neutral-500">
                  {index + 1}
                </span>
              </div>
              <p className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-neutral-900">
                {item.title}
              </p>
            </Panel>
          </Reveal>
        ))}
      </div>

      <Reveal delay={1250}>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Chip className="px-4 py-2 text-[15px]">Nous avons priorisé ces cinq blocs</Chip>
          <Chip className="border-hk-500/20 bg-hk-50 px-4 py-2 text-[15px] text-hk-700">
            Cadence fonctionne déjà · votre espace est la prochaine étape
          </Chip>
        </div>
      </Reveal>

      <Reveal delay={1450}>
        <p className="mt-6 text-center text-[22px] font-medium leading-snug text-neutral-600">
          Ce n’est pas un gros chantier. Mais c’est important de vous l’expliquer.
        </p>
      </Reveal>
    </SlideFrame>
  );
}

export const remainingConnectionsSlide: KeynoteSlide = {
  id: "connexions-restantes",
  label: "Connexions restantes",
  Component: RemainingConnectionsSlide,
  mobile: {
    kicker: "La suite",
    title: "Ce qu’il reste à connecter à votre espace.",
    lead: "La migration a servi à migrer la connectivité. Aujourd’hui, tout fonctionne dans Cadence.",
    chips: ["Les avis", "Le ménage", "Les blocages", "La gestion des prix", "Les photos"],
    footnote: "Ce n’est pas un gros chantier. Mais c’est important de vous l’expliquer.",
  },
};
