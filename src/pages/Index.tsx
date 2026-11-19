import HalloweenPrank from "@/components/HalloweenPrank";

export default function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#10091e] bg-[radial-gradient(ellipse_at_top,_#392047,_transparent_65%)] px-6 py-16 text-center text-white">
      <span className="mb-8 text-7xl" aria-hidden="true">🎃</span>
      <p className="mb-4 text-xs uppercase tracking-[0.4em] text-orange-300">Le 31 octobre, tout peut arriver</p>
      <h1 className="max-w-2xl text-5xl font-black leading-tight sm:text-7xl">Une surprise<br /><span className="text-orange-400">mortellement drôle.</span></h1>
      <p className="mb-10 mt-6 max-w-md text-lg text-purple-200">Un mystérieux cadeau t’attend. Ouvre-le… si tu l’oses !</p>
      <HalloweenPrank featured />
      <p className="mt-8 text-xs text-purple-300/60">Pour profiter de la surprise, garde le son activé. 🦇</p>
    </main>
  );
}
