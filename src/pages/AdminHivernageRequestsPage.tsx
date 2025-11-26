"use client";

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getAllHivernageRequests, HivernageRequest } from '@/lib/hivernage-api';
import { generateHivernageRequestPdf, openHivernageRequestPdfInNewWindow } from '@/lib/pdf-utils';
import { Snowflake, Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const AdminHivernageRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<HivernageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllHivernageRequests();
        setRequests(data);
      } catch (e: any) {
        toast.error(`Erreur: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Snowflake className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Demandes d’hivernage</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Logement</TableHead>
                  <TableHead>Consignes</TableHead>
                  <TableHead>Commentaires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Chargement en cours…</TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>Aucune demande.</TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => {
                    const owner = `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.trim() || r.profiles?.email ?? r.user_id;
                    const room = r.user_rooms?.room_name ?? '—';
                    const i = r.instructions || {};
                    const summary = [
                      i.cut_water ? 'Couper eau' : null,
                      i.cut_water_heater ? 'Couper chauffe-eau' : null,
                      i.heating_frost_mode ? 'Hors-gel' : null,
                      i.empty_fridge ? 'Vider frigo' : null,
                      i.remove_linen ? 'Enlever linge' : null,
                      i.put_linen ? 'Mettre linge' : null,
                      i.close_shutters ? 'Fermer volets' : null,
                      i.no_change ? 'Ne rien modifier' : null,
                    ].filter(Boolean).join(', ') || '—';

                    return (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.created_at).toLocaleString('fr-FR')}</TableCell>
                        <TableCell>{owner}</TableCell>
                        <TableCell>{room}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{summary}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{r.comments ?? '—'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openHivernageRequestPdfInNewWindow(r)}>
                            <Printer className="h-4 w-4 mr-1" /> Imprimer
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => generateHivernageRequestPdf(r)}>
                            <FileDown className="h-4 w-4 mr-1" /> Télécharger PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              <TableCaption>Exportez ou imprimez chaque demande individuellement.</TableCaption>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHivernageRequestsPage;