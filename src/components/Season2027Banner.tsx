import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Season2027Banner() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-semibold">Préparez la saison 2027</h2>
          <p className="mt-1 text-sm text-indigo-800">Proposez vos tarifs. Ils seront examinés et validés par notre équipe avant tout envoi à Cadence.</p>
        </div>
      </div>
      <Button asChild className="w-full bg-indigo-700 text-white hover:bg-indigo-800 sm:w-auto">
        <Link to="/season-2027">Préparer mes prix 2027<ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </section>
  );
}
