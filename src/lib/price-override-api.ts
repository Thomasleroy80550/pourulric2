"use client";

import { supabase } from "@/integrations/supabase/client";

type AdminListParams = {
  page: number;
  pageSize: number;
  qClient?: string;
  qRoom?: string;
  dateFrom?: Date;
  dateTo?: Date;
  qPrice?: string;
  qMinStay?: string;
};

export async function getAllPriceOverridesAdmin(params: AdminListParams) {
  const { page, pageSize, qClient, qRoom, dateFrom, dateTo, qPrice, qMinStay } = params;

  let query = supabase
    .from("price_overrides")
    .select(
      `
      id,
      created_at,
      user_id,
      room_id,
      room_name,
      start_date,
      end_date,
      price,
      min_stay,
      closed,
      closed_on_arrival,
      closed_on_departure,
      profiles:profiles!inner (
        id,
        email,
        first_name,
        last_name
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (dateFrom) {
    query = query.gte("created_at", dateFrom.toISOString());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }
  if (qRoom && qRoom.trim().length > 0) {
    const term = `%${qRoom.trim()}%`;
    query = query.or(`room_name.ilike.${term},room_id.ilike.${term}`);
  }
  if (qPrice && qPrice.trim() !== "") {
    const n = Number(qPrice);
    if (!Number.isNaN(n)) {
      query = query.eq("price", n);
    }
  }
  if (qMinStay && qMinStay.trim() !== "") {
    const n = Number(qMinStay);
    if (!Number.isNaN(n)) {
      query = query.eq("min_stay", n);
    }
  }
  if (qClient && qClient.trim().length > 0) {
    const term = `%${qClient.trim()}%`;
    query = query.or(
      `profiles.email.ilike.${term},profiles.first_name.ilike.${term},profiles.last_name.ilike.${term}`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data, count };
}

// Minimal insert API to satisfy existing imports elsewhere in the app.
// Inserts one or many overrides into price_overrides and returns inserted rows.
export type PriceOverrideInsert = {
  user_id: string;
  room_id?: string | null;
  room_name?: string | null;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string;   // ISO date string (YYYY-MM-DD)
  price?: number | null;
  min_stay?: number | null;
  closed?: boolean | null;
  closed_on_arrival?: boolean | null;
  closed_on_departure?: boolean | null;
};

export async function addOverrides(items: PriceOverrideInsert | PriceOverrideInsert[]) {
  const payload = Array.isArray(items) ? items : [items];
  const { data, error } = await supabase.from("price_overrides").insert(payload).select("*");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}