import { addDays, subDays, format } from "date-fns";
import { UserRoom } from "@/lib/user-room-api";
import { KrossbookingReservation } from "@/lib/krossbooking";
import { SavedInvoice } from "@/lib/admin-api";
import { Review } from "@/lib/reviews-api";
import { Notification } from "@/lib/notifications-api";
import { OwnerTicketSummary } from "@/lib/tickets-api";
import { HousekeepingTask } from "@/lib/housekeeping-api";
import { Faq } from "@/lib/faq-api";

const MOCK_KEY = "v4_mock_mode";

export function isV4MockEnabled(): boolean {
  try {
    return localStorage.getItem(MOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setV4MockEnabled(enabled: boolean): void {
  localStorage.setItem(MOCK_KEY, enabled ? "1" : "0");
}

const d = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const iso = (offset: number) => addDays(new Date(), offset).toISOString();

export const mockRooms: UserRoom[] = [
  {
    id: "mock-room-1",
    user_id: "mock-user",
    room_id: "101",
    room_name: "Appartement Vue Mer",
  },
  {
    id: "mock-room-2",
    user_id: "mock-user",
    room_id: "102",
    room_name: "Studio du Port",
  },
];

const baseRes = {
  property_id: 1,
  email: "",
  phone: "",
};

export const mockReservations: KrossbookingReservation[] = [
  {
    ...baseRes,
    id: "mock-1",
    guest_name: "Camille Dupont",
    property_name: "Appartement Vue Mer",
    krossbooking_room_id: "101",
    check_in_date: d(-2),
    check_out_date: d(2),
    status: "CONFIRMED",
    amount: "620",
    cod_channel: "AIRBNB",
    n_guests: 4,
  },
  {
    ...baseRes,
    id: "mock-2",
    guest_name: "Julien Martin",
    property_name: "Appartement Vue Mer",
    krossbooking_room_id: "101",
    check_in_date: d(4),
    check_out_date: d(9),
    status: "CONFIRMED",
    amount: "845",
    cod_channel: "BOOKING",
    n_guests: 2,
  },
  {
    ...baseRes,
    id: "mock-3",
    guest_name: "Sarah Lefèvre",
    property_name: "Studio du Port",
    krossbooking_room_id: "102",
    check_in_date: d(1),
    check_out_date: d(5),
    status: "CONFIRMED",
    amount: "410",
    cod_channel: "AIRBNB",
    n_guests: 2,
  },
  {
    ...baseRes,
    id: "mock-4",
    guest_name: "Thomas Bernard",
    property_name: "Appartement Vue Mer",
    krossbooking_room_id: "101",
    check_in_date: d(-9),
    check_out_date: d(-4),
    status: "CONFIRMED",
    amount: "530",
    cod_channel: "DIRECT",
    n_guests: 3,
  },
  {
    ...baseRes,
    id: "mock-5",
    guest_name: "Séjour propriétaire",
    property_name: "Studio du Port",
    krossbooking_room_id: "102",
    check_in_date: d(12),
    check_out_date: d(15),
    status: "PROP0",
    amount: "0",
    cod_channel: "OWNER",
  },
  {
    ...baseRes,
    id: "mock-6",
    guest_name: "Emma Rousseau",
    property_name: "Studio du Port",
    krossbooking_room_id: "102",
    check_in_date: d(-15),
    check_out_date: d(-11),
    status: "CONFIRMED",
    amount: "365",
    cod_channel: "BOOKING",
    n_guests: 2,
  },
];

const lastMonth = subDays(new Date(), 30);
const monthLabelFr = (date: Date) =>
  date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

export const mockStatements: SavedInvoice[] = [
  {
    id: "mock-st-1",
    user_id: "mock-user",
    period: monthLabelFr(lastMonth),
    invoice_data: [],
    totals: {
      totalCA: 2480,
      totalMontantVerse: 2130,
      totalFacture: 320,
      totalFraisMenage: 240,
      totalNuits: 18,
      totalVoyageurs: 9,
    },
    created_at: iso(-8),
    profiles: { first_name: "Client", last_name: "Démo" },
    is_paid: true,
  },
  {
    id: "mock-st-2",
    user_id: "mock-user",
    period: monthLabelFr(subDays(new Date(), 60)),
    invoice_data: [],
    totals: {
      totalCA: 1920,
      totalMontantVerse: 1655,
      totalFacture: 265,
      totalFraisMenage: 180,
      totalNuits: 14,
      totalVoyageurs: 7,
    },
    created_at: iso(-38),
    profiles: { first_name: "Client", last_name: "Démo" },
    is_paid: true,
  },
];

export const mockReviews: Review[] = [
  {
    id: "mock-rev-1",
    author: "Camille",
    avatar: "",
    rating: 5,
    date: "il y a 3 jours",
    rawDate: iso(-3),
    comment:
      "Superbe appartement, très propre et idéalement situé. L'accueil était parfait !",
    source: "AIRBNB",
  },
  {
    id: "mock-rev-2",
    author: "Julien",
    avatar: "",
    rating: 4.5,
    date: "il y a 2 semaines",
    rawDate: iso(-14),
    comment: "Très bon séjour, logement conforme aux photos. Nous reviendrons.",
    source: "BOOKING",
  },
  {
    id: "mock-rev-3",
    author: "Emma",
    avatar: "",
    rating: 5,
    date: "il y a 1 mois",
    rawDate: iso(-30),
    comment: "Emplacement idéal et communication au top. Merci !",
    source: "AIRBNB",
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "mock-n-1",
    user_id: "mock-user",
    message: "Votre relevé du mois est disponible.",
    link: "/v4/finances",
    is_read: false,
    created_at: iso(-1),
  },
  {
    id: "mock-n-2",
    user_id: "mock-user",
    message: "Nouvel avis 5★ reçu sur Airbnb.",
    link: "/v4/avis",
    is_read: false,
    created_at: iso(-3),
  },
  {
    id: "mock-n-3",
    user_id: "mock-user",
    message: "Le ménage de votre logement a été effectué.",
    is_read: true,
    created_at: iso(-5),
  },
];

export const mockTickets: OwnerTicketSummary[] = [
  {
    id: "mock-t-1",
    subject: "Question sur mon relevé de septembre",
    from_email: "client@exemple.fr",
    status: "open",
    priority: "medium",
    preview: "Bonjour, pouvez-vous me préciser le détail des frais de ménage ?",
    created_at: iso(-2),
    last_activity_at: iso(-1),
    unread_count: 1,
    source_provider: null,
    source_email_id: null,
    reopened_by_client_at: null,
    archived_at: null,
    spam_at: null,
  },
];

export const mockHousekeeping: HousekeepingTask[] = [
  {
    id: 9001,
    idRoom: 101,
    room: "Appartement Vue Mer",
    taskType: "cleaning",
    dateScheduled: d(0),
    timeScheduled: "11:00",
    timeStart: "11:00",
    timeEnd: "13:00",
    completed: true,
    note: "",
    codStatus: "DONE",
    users: ["Équipe Hello Keys"],
    taskCost: null,
    nextArrivalDate: d(1),
    nextArrivalTime: "16:00",
    nextArrivalGuests: 2,
    nextDepartureDate: "",
  },
  {
    id: 9002,
    idRoom: 102,
    room: "Studio du Port",
    taskType: "cleaning",
    dateScheduled: d(5),
    timeScheduled: "10:00",
    timeStart: "",
    timeEnd: "",
    completed: false,
    note: "",
    codStatus: "PLANNED",
    users: [],
    taskCost: null,
    nextArrivalDate: d(5),
    nextArrivalTime: "17:00",
    nextArrivalGuests: 2,
    nextDepartureDate: "",
  },
  {
    id: 9003,
    idRoom: 101,
    room: "Appartement Vue Mer",
    taskType: "cleaning",
    dateScheduled: d(-4),
    timeScheduled: "11:00",
    timeStart: "11:00",
    timeEnd: "12:30",
    completed: true,
    note: "",
    codStatus: "DONE",
    users: ["Équipe Hello Keys"],
    taskCost: null,
    nextArrivalDate: "",
    nextArrivalTime: "",
    nextArrivalGuests: null,
    nextDepartureDate: "",
  },
];

export const mockFaqs: Faq[] = [
  {
    id: "mock-faq-1",
    question: "Quand suis-je payé de mes revenus ?",
    answer:
      "Vos revenus sont versés chaque mois, généralement avant le 10, accompagnés de votre relevé détaillé.",
    is_published: true,
    created_at: iso(-90),
    updated_at: iso(-90),
  },
  {
    id: "mock-faq-2",
    question: "Comment bloquer des dates pour mon usage personnel ?",
    answer:
      "Depuis le calendrier, touchez « Bloquer des dates pour moi » et choisissez vos dates de séjour.",
    is_published: true,
    created_at: iso(-90),
    updated_at: iso(-90),
  },
];
