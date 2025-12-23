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

  // Build base query with join to profiles to fetch client info
  let query = supabase
    .from("price_overrides")
    .select(`
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
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // Filters
  if (dateFrom) {
    query = query.gte("created_at", dateFrom.toISOString());
  }
  if (dateTo) {
    // include the end of day for dateTo
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }
  if (qRoom && qRoom.trim().length > 0) {
    // ilike on room_name or room_id
    const term = `%${qRoom.trim()}%`;
    // supabase doesn't support OR directly on the client without filter() raw; use or()
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
    // Need to filter on joined profile fields using or with foreign table columns
    // Supabase filter syntax: or('profiles.email.ilike.%foo%,profiles.first_name.ilike.%foo%,profiles.last_name.ilike.%foo%')
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