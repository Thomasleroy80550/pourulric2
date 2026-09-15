export const PROPERTY_IMG = "/assets/v4-property.png";

export const owner = {
  firstName: "Thomas",
  initials: "TH",
};

export const property = {
  name: "Pointe de Sel",
  city: "Sainte-Maxime",
};

export type BookingChannel = "airbnb" | "booking" | "direct";

export interface Booking {
  id: string;
  guestName: string;
  startDate: string; // ISO
  endDate: string;
  guests: number;
  amount: number;
  channel: BookingChannel;
  nights: number;
  past?: boolean;
}

export const bookings: Booking[] = [
  {
    id: "r1",
    guestName: "Martine DESANGLOIS",
    startDate: "2026-09-16",
    endDate: "2026-09-21",
    guests: 2,
    amount: 1200,
    channel: "airbnb",
    nights: 5,
  },
  {
    id: "r2",
    guestName: "Sophie Martin",
    startDate: "2026-10-03",
    endDate: "2026-10-08",
    guests: 3,
    amount: 1650,
    channel: "booking",
    nights: 5,
  },
  {
    id: "r3",
    guestName: "Lucas Bernard",
    startDate: "2026-10-22",
    endDate: "2026-10-29",
    guests: 4,
    amount: 2100,
    channel: "airbnb",
    nights: 7,
  },
  {
    id: "r4",
    guestName: "Claire Lefèvre",
    startDate: "2026-11-12",
    endDate: "2026-11-16",
    guests: 2,
    amount: 980,
    channel: "direct",
    nights: 4,
  },
  {
    id: "r5",
    guestName: "Antoine Dubois",
    startDate: "2026-12-03",
    endDate: "2026-12-07",
    guests: 2,
    amount: 1050,
    channel: "booking",
    nights: 4,
  },
  {
    id: "p1",
    guestName: "Julie Moreau",
    startDate: "2026-08-10",
    endDate: "2026-08-17",
    guests: 4,
    amount: 2450,
    channel: "airbnb",
    nights: 7,
    past: true,
  },
  {
    id: "p2",
    guestName: "Marc Petit",
    startDate: "2026-07-24",
    endDate: "2026-07-31",
    guests: 5,
    amount: 2800,
    channel: "booking",
    nights: 7,
    past: true,
  },
];

export const monthFinance = {
  month: "Septembre 2026",
  revenue: 4500,
  trend: "+ 12 %",
  trendVs: "vs septembre 2025",
  grossRevenue: 5850,
  commission: 1350,
  occupancy: 68,
  nightsBooked: 14,
  stays: [
    { label: "16 → 21 sept.", guest: "Martine DESANGLOIS", amount: 1200 },
    { label: "22 → 29 oct.", guest: "Lucas Bernard", amount: 2100 },
  ],
  adjustments: 150,
};

export const payouts = [
  { date: "30 sept. 2026", amount: 4500, label: "Séjour de sept. 2026", status: "À venir" },
  { date: "31 oct. 2026", amount: 3750, label: "Séjour d'oct. 2026", status: "À venir" },
];

export const statements = [
  { month: "Janvier 2026", amount: 3200 },
  { month: "Février 2026", amount: 2850 },
  { month: "Mars 2026", amount: 4100 },
  { month: "Avril 2026", amount: 4650 },
  { month: "Mai 2026", amount: 5200 },
  { month: "Juin 2026", amount: 4800 },
  { month: "Juillet 2026", amount: 5950 },
];

export const reviews = {
  average: 4.5,
  count: 5,
  items: [
    {
      author: "Sophie M.",
      date: "Août 2026",
      rating: 5,
      channel: "airbnb" as BookingChannel,
      text: "Séjour parfait ! Logement magnifique et très bien situé.",
    },
    {
      author: "Lucas B.",
      date: "Juillet 2026",
      rating: 5,
      channel: "booking" as BookingChannel,
      text: "Tout était parfait, merci à l'équipe Hello Keys !",
    },
    {
      author: "Clara D.",
      date: "Juin 2026",
      rating: 4,
      channel: "booking" as BookingChannel,
      text: "Très bon séjour, logement conforme aux photos.",
    },
  ],
};

export const activities = [
  { icon: "cleaning", label: "Ménage effectué", when: "il y a 2 jours" },
  { icon: "booking", label: "Nouvelle réservation", when: "il y a 4 jours" },
  { icon: "review", label: "Nouvel avis 5★", when: "il y a 6 jours" },
];

export const monthlyRevenueBars = [2850, 3200, 3600, 4100, 4650, 5200, 5950];

export function formatEuro(n: number): string {
  return n.toLocaleString("fr-FR") + " €";
}
