import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAllProfiles, type UserProfile } from '@/lib/admin-api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ShieldCheck, Search } from 'lucide-react';

type DelegatedInvite = {
  id: string;
  owner_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'revoked';
  viewer_id: string | null;
  created_at: string;
  accepted_at: string | null;
};

const statusBadge = (status: DelegatedInvite['status']) => {
  switch (status) {
    case 'accepted':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Acceptée</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En attente</Badge>;
    case 'revoked':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Révoquée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const AdminDelegatedAccessPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: invites, isLoading: loadingInvites, error } = useQuery<DelegatedInvite[]>({
    queryKey: ['adminDelegatedInvites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delegated_invoice_viewers')
        .select('id, owner_id, invitee_email, status, viewer_id, created_at, accepted_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DelegatedInvite[];
    },
  });

  const { data: profiles, isLoading: loadingProfiles } = useQuery<UserProfile[]>({
    queryKey: ['adminAllProfiles'],
    queryFn: getAllProfiles,
  });

  const profileById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    (profiles || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  const displayName = (userId: string | null) => {
    if (!userId) return null;
    const p = profileById.get(userId);
    if (!p) return userId.slice(0, 8) + '…';
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    return name || p.email || userId.slice(0, 8) + '…';
  };

  const filtered = useMemo(() => {
    let rows = invites || [];
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const owner = profileById.get(r.owner_id);
        const ownerText = [owner?.first_name, owner?.last_name, owner?.email].filter(Boolean).join(' ').toLowerCase();
        return r.invitee_email.toLowerCase().includes(q) || ownerText.includes(q);
      });
    }
    return rows;
  }, [invites, statusFilter, search, profileById]);

  const isLoading = loadingInvites || loadingProfiles;

  const stats = useMemo(() => {
    const all = invites || [];
    return {
      total: all.length,
      accepted: all.filter((i) => i.status === 'accepted').length,
      pending: all.filter((i) => i.status === 'pending').length,
      revoked: all.filter((i) => i.status === 'revoked').length,
    };
  }, [invites]);

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Accès délégués
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de tous les accès délégués accordés par les propriétaires (invitations, acceptations, révocations).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Acceptées</p>
              <p className="text-2xl font-semibold text-green-600">{stats.accepted}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Révoquées</p>
              <p className="text-2xl font-semibold text-red-600">{stats.revoked}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par propriétaire ou email invité…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="accepted">Acceptées</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="revoked">Révoquées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">
              Erreur lors du chargement des accès délégués.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun accès délégué trouvé.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Email invité</TableHead>
                    <TableHead>Compte délégué</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Invité le</TableHead>
                    <TableHead>Accepté le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{displayName(inv.owner_id)}</TableCell>
                      <TableCell>{inv.invitee_email}</TableCell>
                      <TableCell>
                        {inv.viewer_id ? (
                          displayName(inv.viewer_id)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell>{formatDate(inv.created_at)}</TableCell>
                      <TableCell>{formatDate(inv.accepted_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDelegatedAccessPage;
