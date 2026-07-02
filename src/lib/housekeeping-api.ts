import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "./profile-api";
import { getUserRooms } from "./user-room-api";

const KROSSBOOKING_PROXY_URL =
  "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";

export type HousekeepingTaskType = "cleaning" | "task" | "maintenance";

export interface HousekeepingTask {
  id: number;
  idRoom: number;
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
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Impossible de récupérer la session utilisateur.");
  if (!data.session?.access_token) throw new Error("Utilisateur non authentifié.");
  return data.session.access_token;
}

async function callProxy(action: string, payload: Record<string, unknown>): Promise<any> {
  const accessToken = await getAccessToken();
  const response = await fetch(KROSSBOOKING_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const responseText = await response.text();
  const parsed = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(parsed?.error || "Une erreur est survenue lors de la récupération des tâches de ménage.");
  }

  return parsed?.data ?? [];
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUsers(users: unknown): string[] {
  if (!Array.isArray(users)) return [];
  return users
    .map((u: any) => {
      if (typeof u === "string") return u;
      return u?.name || u?.cod_user || u?.label || "";
    })
    .filter((u: string) => !!u);
}

function mapTask(raw: Record<string, any>): HousekeepingTask {
  return {
    id: Number(raw.id ?? raw.id_task ?? 0),
    idRoom: Number(raw.id_room ?? 0),
    room: String(raw.room ?? raw.room_label ?? "").trim(),
    taskType: String(raw.task_type ?? raw.cod_task_type ?? "task"),
    dateScheduled: String(raw.date_scheduled ?? raw.date ?? ""),
    timeScheduled: String(raw.time_scheduled ?? ""),
    timeStart: String(raw.time_start ?? ""),
    timeEnd: String(raw.time_end ?? ""),
    completed: Boolean(raw.completed),
    note: String(raw.note ?? raw.notes ?? "").trim(),
    codStatus: String(raw.cod_status ?? ""),
    users: normalizeUsers(raw.users),
    taskCost: toNumber(raw.task_cost),
    nextArrivalDate: String(raw.next_arrival_date ?? ""),
    nextArrivalTime: String(raw.next_arrival_time ?? ""),
    nextArrivalGuests: toNumber(raw.next_arrival_guests),
    nextDepartureDate: String(raw.next_departure_date ?? ""),
  };
}

export interface FetchHousekeepingParams {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
  taskType?: HousekeepingTaskType | "all";
}

/**
 * Récupère les tâches de ménage/maintenance pour les logements du client connecté.
 * Le proxy interroge Krossbooking par propriété ; on filtre ensuite sur les
 * logements réellement rattachés à l'utilisateur (table user_rooms).
 */
export async function fetchClientHousekeepingTasks({
  dateFrom,
  dateTo,
  taskType,
}: FetchHousekeepingParams): Promise<HousekeepingTask[]> {
  const [profile, userRooms] = await Promise.all([getProfile(), getUserRooms()]);

  const payload: Record<string, unknown> = {
    date_from: dateFrom,
    date_to: dateTo,
  };
  if (profile?.krossbooking_property_id) {
    payload.id_property = profile.krossbooking_property_id;
  }
  if (taskType && taskType !== "all") {
    payload.task_type = taskType;
  }

  const rawTasks = await callProxy("get_housekeeping_tasks", payload);
  const tasks = (Array.isArray(rawTasks) ? rawTasks : []).map(mapTask);

  // Restreint aux logements du client.
  const allowedRoomIds = new Set(
    userRooms
      .map((room) => Number(room.room_id))
      .filter((id) => Number.isFinite(id)),
  );

  const filtered = allowedRoomIds.size > 0
    ? tasks.filter((task) => allowedRoomIds.has(task.idRoom))
    : tasks;

  // Tri chronologique (date puis heure planifiée).
  return filtered.sort((a, b) => {
    const dateCompare = a.dateScheduled.localeCompare(b.dateScheduled);
    if (dateCompare !== 0) return dateCompare;
    return (a.timeScheduled || "").localeCompare(b.timeScheduled || "");
  });
}
