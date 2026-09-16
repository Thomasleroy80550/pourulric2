import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, CalendarClock } from "lucide-react";
import { parseISO, isValid, format } from "date-fns";
import { fr } from "date-fns/locale";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { HousekeepingTask } from "@/lib/housekeeping-api";
import { useV4Housekeeping, useV4Rooms } from "./v4-data";
import { cn } from "@/lib/utils";

function taskDateLabel(task: HousekeepingTask): string {
  const d = parseISO(task.dateScheduled);
  if (!isValid(d)) return task.dateScheduled;
  const label = format(d, "EEEE d MMMM", { locale: fr });
  const time = task.timeScheduled ? ` · ${task.timeScheduled.slice(0, 5)}` : "";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${time}`;
}

const TaskRow: React.FC<{ task: HousekeepingTask; showRoom: boolean }> = ({
  task,
  showRoom,
}) => (
  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        task.completed ? "bg-emerald-50" : "bg-hk-50"
      )}
    >
      <Sparkles
        className={cn(
          "h-5 w-5",
          task.completed ? "text-emerald-500" : "text-hk-600"
        )}
      />
    </span>
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-900">
        Ménage{showRoom && task.room ? ` · ${task.room}` : ""}
      </p>
      <p className="text-xs text-slate-500">{taskDateLabel(task)}</p>
      {task.nextArrivalDate && !task.completed && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <CalendarClock className="h-3 w-3" />
          Avant l'arrivée du{" "}
          {isValid(parseISO(task.nextArrivalDate))
            ? format(parseISO(task.nextArrivalDate), "d MMM", { locale: fr })
            : task.nextArrivalDate}
        </p>
      )}
    </div>
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        task.completed
          ? "bg-emerald-50 text-emerald-600"
          : "bg-hk-50 text-hk-600"
      )}
    >
      {task.completed ? "Terminé" : "Prévu"}
    </span>
  </div>
);

const MenageV4: React.FC = () => {
  const { data: tasks, isLoading } = useV4Housekeeping(30, 30);
  const { data: rooms } = useV4Rooms();
  const showRoom = (rooms ?? []).length > 1;

  const all = tasks ?? [];
  const upcoming = all
    .filter((t) => !t.completed)
    .sort((a, b) => a.dateScheduled.localeCompare(b.dateScheduled));
  const done = all
    .filter((t) => t.completed)
    .sort((a, b) => b.dateScheduled.localeCompare(a.dateScheduled));

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <div className="flex items-center gap-3">
          <Link
            to="/v4"
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Ménages</h1>
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && all.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucun ménage sur les 30 derniers et prochains jours.
          </p>
        )}

        {upcoming.length > 0 && (
          <div>
            <h2 className="px-1 font-semibold text-slate-900">À venir</h2>
            <div className="mt-2 rounded-2xl bg-white shadow-sm">
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} showRoom={showRoom} />
              ))}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <h2 className="px-1 font-semibold text-slate-900">Effectués</h2>
            <div className="mt-2 rounded-2xl bg-white shadow-sm">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} showRoom={showRoom} />
              ))}
            </div>
          </div>
        )}
      </div>
    </V4Layout>
  );
};

export default MenageV4;
