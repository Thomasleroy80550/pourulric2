"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { supabase } from "../integrations/supabase/client";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { RotateCw, Search } from "lucide-react";

type UserRoom = {
  id: string;
  user_id: string;
  room_id: string | null;
  room_id_2: string | null;
  room_name: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

type EnrichedRoom = UserRoom & {
  profile?: Profile | null;
};

type DuplicateGroup = {
  key: string;
  count: number;
  items: EnrichedRoom[];
  distinctUsers: number;
};

const AdminDuplicateRoomIdsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EnrichedRoom[]>([]);
  const [filter, setFilter] = useState("");

  const fetchAll = async () => {
    setLoading(true);

    // 1) Fetch all user_rooms (admin has full read via RLS)
    const { data: rooms, error: roomsError } = await supabase
      .from("user_rooms")
      .select("id,user_id,room_id,room_id_2,room_name");

    if (roomsError) {
      setLoading(false);
      throw new Error(roomsError.message);
    }

    const list = (rooms || []) as UserRoom[];

    // 2) Fetch profiles for the involved users
    const userIds = Array.from(new Set(list.map(r => r.user_id))).filter(Boolean);
    let profilesById = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      if (profilesError) {
        setLoading(false);
        throw new Error(profilesError.message);
      }
      (profiles || []).forEach((p: any) => {
        profilesById.set(p.id, p as Profile);
      });
    }

    // 3) Enrich rows with profile
    const enriched: EnrichedRoom[] = list.map(r => ({
      ...r,
      profile: profilesById.get(r.user_id) || null
    }));

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const buildDuplicates = (items: EnrichedRoom[], key: "room_id" | "room_id_2") => {
    const map = new Map<string, EnrichedRoom[]>();
    for (const it of items) {
      const raw = (it[key] || "").trim();
      if (!raw) continue;
      const arr = map.get(raw) || [];
      arr.push(it);
      map.set(raw, arr);
    }

    const groups: DuplicateGroup[] = [];
    map.forEach((arr, k) => {
      const distinctUsers = new Set(arr.map(a => a.user_id)).size;
      // Only show duplicates shared by at least 2 different users
      if (distinctUsers >= 2) {
        groups.push({ key: k, count: arr.length, items: arr, distinctUsers });
      }
    });

    // Sort by most impacted (distinct users), then count, then alpha
    groups.sort((a, b) => (b.distinctUsers - a.distinctUsers) || (b.count - a.count) || a.key.localeCompare(b.key));
    return groups;
  };

  const filterMatch = (g: DuplicateGroup) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    if (g.key.toLowerCase().includes(f)) return true;
    return g.items.some((it) => {
      const name = [it.profile?.first_name, it.profile?.last_name].filter(Boolean).join(" ");
      const email = it.profile?.email || "";
      const user = `${name} ${email} ${it.user_id}`.toLowerCase();
      const room = `${it.room_name || ""} ${it.room_id || ""} ${it.room_id_2 || ""}`.toLowerCase();
      return user.includes(f) || room.includes(f);
    });
  };

  const dupRoomId = useMemo(
    () => buildDuplicates(rows, "room_id").filter(filterMatch),
    [rows, filter]
  );

  const dupRoomId2 = useMemo(
    () => buildDuplicates(rows, "room_id_2").filter(filterMatch),
    [rows, filter]
  );

  const reset = () => {
    setFilter("");
    fetchAll();
  };

  const renderGroupTable = (groups: DuplicateGroup[]) => {
    if (groups.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">Aucun doublon détecté avec le filtre actuel.</div>
      );
    }
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">ID dupliqué</TableHead>
              <TableHead>Comptes impactés</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.key}>
                <TableCell className="align-top">
                  <div className="font-medium">{g.key}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.count} occurence{g.count > 1 ? "s" : ""} • {g.distinctUsers} utilisateur{g.distinctUsers > 1 ? "s" : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {g.items.map((it) => {
                      const fullName = [it.profile?.first_name, it.profile?.last_name].filter(Boolean).join(" ");
                      const label = fullName || it.profile?.email || it.user_id;
                      return (
                        <div key={it.id} className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="font-normal">{label}</Badge>
                          <span className="text-[11px] text-muted-foreground">#{it.user_id}</span>
                          <span className="text-xs">•</span>
                          <span className="text-sm">{it.room_name || "(Sans nom)"}</span>
                          <div className="flex gap-1 text-xs text-muted-foreground">
                            <span>(ID: {it.room_id || "-"})</span>
                            {it.room_id_2 ? <span>— ID2: {it.room_id_2}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout title="Doublons d'ID Chambre">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Recherche</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Filtrer par ID, client, email, logement…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={loading}>
              <RotateCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Doublons sur ID Chambre (Krossbooking)</h2>
          <p className="text-sm text-muted-foreground">
            Détecte les mêmes valeurs de room_id partagées par plusieurs comptes.
          </p>
          {renderGroupTable(dupRoomId)}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Doublons sur ID Chambre Numéro 2 (Prix/Restrictions)</h2>
          <p className="text-sm text-muted-foreground">
            Détecte les mêmes valeurs de room_id_2 partagées par plusieurs comptes.
          </p>
          {renderGroupTable(dupRoomId2)}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDuplicateRoomIdsPage;