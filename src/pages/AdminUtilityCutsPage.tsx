import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAllUserRooms, type AdminUserRoom } from '@/lib/admin-api';
import { Loader2, PlugZap, Droplet, Search } from 'lucide-react';

type FilterType = 'all' | 'electricity' | 'water';

const AdminUtilityCutsPage: React.FC = () => {
  const [rooms, setRooms] = useState<AdminUserRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    setLoading(true);
    getAllUserRooms()
      .then((data) => setRooms(data || []))
      .finally(() => setLoading(false));
  }, []);

  const { cutElectricCount, cutWaterCount } = useMemo(() => {
    let electric = 0;
    let water = 0;
    rooms.forEach((r) => {
      if (r.is_electricity_cut) electric += 1;
      if (r.is_water_cut) water += 1;
    });
    return { cutElectricCount: electric, cutWaterCount: water };
  }, [rooms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => {
        const byFilter =
          filter === 'all'
            ? (r.is_electricity_cut || r.is_water_cut)
            : filter === 'electricity'
              ? !!r.is_electricity_cut
              : !!r.is_water_cut;

        if (!byFilter) return false;

        if (!q) return true;

        const clientName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase();
        const roomName = (r.room_name || '').toLowerCase();
        const roomId = (r.room_id || '').toLowerCase();
        return clientName.includes(q) || roomName.includes(q) || roomId.includes(q);
      })
      .sort((a, b) => (a.room_name || '').localeCompare(b.room_name || ''));
  }, [rooms, search, filter]);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Compteurs coupés</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <PlugZap className="h-4 w-4 text-amber-600" /> Elec: {cutElectricCount}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Droplet className="h-4 w-4 text-sky-600" /> Eau: {cutWaterCount}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher (client, logement, ID chambre)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <Select value={filter} onValueChange={(v: FilterType) => setFilter(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous (élec ou eau)</SelectItem>
                    <SelectItem value="electricity">Électricité coupée</SelectItem>
                    <SelectItem value="water">Eau coupée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Résultats:</span>
                <span className="font-medium text-foreground">{filtered.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground mt-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des logements…
          </div>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Logements concernés</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun logement avec compteur coupé selon vos critères.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Logement</TableHead>
                      <TableHead>ID Chambre</TableHead>
                      <TableHead className="text-center">Électricité</TableHead>
                      <TableHead className="text-center">Eau</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const client = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim() || '—';
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{client}</TableCell>
                          <TableCell className="font-medium">{r.room_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.room_id}</TableCell>
                          <TableCell className="text-center">
                            {r.is_electricity_cut ? (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-300">Coupée</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.is_water_cut ? (
                              <Badge className="bg-sky-100 text-sky-700 border border-sky-300">Coupée</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUtilityCutsPage;