import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Eye, MessageSquare, Trash2 } from 'lucide-react';
import { getSavedInvoices, deleteInvoice, SavedInvoice } from '@/lib/admin-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import StatementDetailsDialog from '@/components/StatementDetailsDialog';
import AddCommentDialog from '@/components/AddCommentDialog';

const AdminStatementsPage: React.FC = () => {
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);

  const loadStatements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSavedInvoices();
      setStatements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, []);

  const handleViewDetails = (statement: SavedInvoice) => {
    setSelectedStatement(statement);
    setIsDetailDialogOpen(true);
  };

  const handleOpenCommentDialog = (statement: SavedInvoice) => {
    setSelectedStatement(statement);
    setIsCommentDialogOpen(true);
  };

  const handleDelete = async (statementId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce relevé ? Cette action est irréversible.")) {
      return;
    }
    try {
      await deleteInvoice(statementId);
      toast.success("Relevé supprimé avec succès !");
      loadStatements(); // Refresh the list
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gestion des Relevés</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Historique de tous les relevés générés</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : statements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun relevé sauvegardé pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Date de Création</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead className="text-right">Montant Facturé</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => {
                    const clientName = statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client Supprimé';
                    return (
                      <TableRow key={statement.id}>
                        <TableCell className="font-medium">{clientName}</TableCell>
                        <TableCell>{statement.period}</TableCell>
                        <TableCell>{format(parseISO(statement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>{statement.admin_comment ? 'Oui' : 'Non'}</TableCell>
                        <TableCell className="text-right font-bold">{statement.totals.totalFacture.toFixed(2)}€</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleViewDetails(statement)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => handleOpenCommentDialog(statement)}><MessageSquare className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(statement.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <StatementDetailsDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        statement={selectedStatement}
      />
      <AddCommentDialog
        isOpen={isCommentDialogOpen}
        onOpenChange={setIsCommentDialogOpen}
        statement={selectedStatement}
        onCommentSaved={loadStatements}
      />
    </AdminLayout>
  );
};

export default AdminStatementsPage;