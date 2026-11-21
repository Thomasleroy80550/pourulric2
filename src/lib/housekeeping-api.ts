import { getReservationSources, type ReservationSource } from "./channel-reservations-api";
import { getChannelCleaningList, type ChannelCleaningIntervention } from "./channel-features-api";

export type HousekeepingTaskType = "cleaning" | "task" | "maintenance";

export interface HousekeepingTask {
  id: string;
  idRoom: string;
  room: string;
  taskType: HousekeepingTaskType | string;
  dateScheduled: string; // yyyy-mm-dd
  timeScheduled: string;
  timeStart: string;
  timeEnd: string;
  completed: boolean;
  note: string;
  codStatus: string;
  users: string[];
  taskCost: number | null;
  nextArrivalDate: string;
  nextArrivalTime: string;
  nextArrivalGuests: number | null;
  nextDepartureDate: string;
  assignmentId: string;
  jobId: string;
}

export interface FetchHousekeepingParams {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
  taskType?: HousekeepingTaskType | "all";
}

async function getAllSources(): Promise<ReservationSource[]> {
  const sources: ReservationSource[] = [];
  let cursor: string | null = null;
  do {
    const page = await getReservationSources(cursor);
    sources.push(...page.sources);
    cursor = page.next_cursor;
  } while (cursor);
  return sources;
}

async function getAllInterventions(source: ReservationSource, dateFrom: string, dateTo: string): Promise<ChannelCleaningIntervention[]> {
  const interventions: ChannelCleaningIntervention[] = [];
  let cursor: string | null = null;
  do {
    const page = await getChannelCleaningList({
      assignmentId: source.id,
      cursor,
      from: dateFrom,
      to: dateTo,
      limit: 50,
    });
    interventions.push(...page.interventions);
    cursor = page.next_cursor;
  } while (cursor);
  return interventions;
}

function timePart(timestamp: string | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function mapIntervention(intervention: ChannelCleaningIntervention, source: ReservationSource): HousekeepingTask {
  const roomName = source.user_rooms?.room_name || source.property_name || `Logement ${source.property_id.slice(0, 8)}`;
  return {
    id: intervention.id,
    idRoom: source.user_rooms?.room_id || intervention.property_id,
    room: roomName,
    taskType: "cleaning",
    dateScheduled: intervention.scheduled_date,
    timeScheduled: timePart(intervention.started_at),
    timeStart: timePart(intervention.started_at),
    timeEnd: timePart(intervention.completed_at),
    completed: intervention.status === "done",
    note: intervention.rooms.join(" · "),
    codStatus: intervention.status,
    users: [],
    taskCost: null,
    nextArrivalDate: "",
    nextArrivalTime: "",
    nextArrivalGuests: null,
    nextDepartureDate: "",
    assignmentId: source.id,
    jobId: intervention.id,
  };
}

/** Récupère les interventions Cadence des logements explicitement attribués au profil connecté. */
export async function fetchClientHousekeepingTasks({
  dateFrom,
  dateTo,
  taskType,
}: FetchHousekeepingParams): Promise<HousekeepingTask[]> {
  if (taskType && taskType !== "all" && taskType !== "cleaning") return [];
  const sources = await getAllSources();
  const taskGroups = await Promise.all(sources.map(async source => {
    try {
      const interventions = await getAllInterventions(source, dateFrom, dateTo);
      return interventions.map(intervention => mapIntervention(intervention, source));
    } catch (error) {
      console.warn("Cadence housekeeping unavailable for assignment", source.id, error);
      return [];
    }
  }));

  return taskGroups.flat().sort((a, b) => {
    const dateCompare = a.dateScheduled.localeCompare(b.dateScheduled);
    if (dateCompare !== 0) return dateCompare;
    return (a.timeScheduled || "").localeCompare(b.timeScheduled || "");
  });
}
