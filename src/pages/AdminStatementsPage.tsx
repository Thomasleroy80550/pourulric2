import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Eye, MessageSquare, Trash2, Send, Loader2, RefreshCw, Search, Pencil } from 'lucide-react';
import { getSavedInvoices, deleteInvoice, SavedInvoice, sendStatementByEmail, resendStatementToPennylane } from '@/lib/admin-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import StatementDetailsDialog from '@/components/StatementDetailsDialog';
import AddCommentDialog from '@/components/AddCommentDialog';
import { generateStatementPdf } from '@/lib/pdf-utils';
import { uploadStatementPdf } from '@/lib/storage-api';
import StatusBadge from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AdminStatementsPage: React.FC = () => {
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [sendingStatementId, setSendingStatementId] = useState<string | null>(null);
  const [retriggeringPennylaneId, setRetriggeringPennylaneId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

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

  const handleEdit = (statementId: string) => {
    navigate(`/admin/generate-invoice/${statementId}`);
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

  const handleSendStatement = async (statement: SavedInvoice) => {
    if (!window.confirm("Êtes-vous sûr de vouloir générer le PDF et l'envoyer par e-mail au client ?")) {
      return;
    }
    setSendingStatementId(statement.id);
    const toastId = toast.loading("Préparation du relevé en cours...");
    try {
      // 1. Générer le PDF
      toast.info("Génération du PDF...", { id: toastId });
      const pdfFile = await generateStatementPdf(statement);

      // 2. Téléverser le PDF
      toast.info("Téléversement du PDF...", { id: toastId });
      const { path } = await uploadStatementPdf(statement.user_id, statement.id, pdfFile);

      // 3. Déclencher la fonction Edge
      toast.info("Mise en file d'attente de l'e-mail...", { id: toastId });
      await sendStatementByEmail(statement.id, path);
      
      toast.success("Relevé envoyé avec succès par e-mail !", { id: toastId });
    } catch (err: any) {
      console.error("Erreur lors de l'envoi du relevé:", err);
      toast.error(`Erreur lors de l'envoi: ${err.message}`, { id: toastId });
    } finally {
      setSendingStatementId(null);
    }
  };

  const handleResendToPennylane = async (statementId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir relancer la création de la facture sur Pennylane ?")) {
      return;
    }
    setRetriggeringPennylaneId(statementId);
    const toastId = toast.loading("Relance de la création Pennylane en cours...");
    try {
      await resendStatementToPennylane(statementId);
      toast.success("La création de la facture Pennylane a été relancée.", { id: toastId });
      loadStatements(); // Refresh to show new status
    } catch (err: any) {
      console.error("Erreur lors de la relance Pennylane:", err);
      toast.error(`Erreur lors de la relance: ${err.message}`, { id: toastId });
    } finally {
      setRetriggeringPennylaneId(null);
    }
  };

  const filteredStatements = statements.filter(statement => {
    const term = searchTerm.toLowerCase();
    const clientName = statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}`.toLowerCase() : 'client supprimé';
    const period = statement.period.toLowerCase();
    const pennylaneStatus = statement.pennylane_status.toLowerCase();
    
    return clientName.includes(term) || period.includes(term) || pennylaneStatus.includes(term);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStatements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStatements = filteredStatements.slice(startIndex, endIndex);

  const getPaginationItems = () => {
    const pages = [];
    const maxPagesToShow = 5; // Number of page links to show directly

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 2) {
        pages.push('...');
      }
      if (currentPage > 1 && currentPage < totalPages) {
        pages.push(currentPage);
      }
      if (currentPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return [...new Set(pages)]; // Remove duplicates
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gestion des Relevés</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Historique de tous les relevés générés ({filteredStatements.length} relevé(s))</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, période ou statut..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-8 w-full md:w-1/3"
              />
            </div>
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
            ) : filteredStatements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun relevé trouvé pour votre recherche.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Date de Création</TableHead>
                      <TableHead>Statut Pennylane</TableHead>
                      <TableHead>Commentaire</TableHead>
                      <TableHead className="text-right">Montant Facturé</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStatements.map((statement) => {
                      const clientName = statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client Supprimé';
                      return (
                        <TableRow key={statement.id}>
                          <TableCell className="font-medium">{clientName}</TableCell>
                          <TableCell>{statement.period}</TableCell>
                          <TableCell>{format(parseISO(statement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                          <TableCell>
                            <StatusBadge status={statement.pennylane_status} />
                          </TableCell>
                          <TableCell>{statement.admin_comment ? 'Oui' : 'Non'}</TableCell>
                          <TableCell className="text-right font-bold">{statement.totals.totalFacture.toFixed(2)}€</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="outline" size="icon" onClick={() => handleViewDetails(statement)} title="Voir les détails"><Eye className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => handleEdit(statement.id)} title="Modifier le relevé"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => handleOpenCommentDialog(statement)} title="Ajouter/Voir commentaire"><MessageSquare className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => handleSendStatement(statement)} disabled={sendingStatementId === statement.id} title="Envoyer par e-mail">
                              {sendingStatementId === statement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            {statement.pennylane_invoice_url ? (
                              <Button variant="outline" size="icon" asChild title="Voir facture Pennylane">
                                <a href={statement.pennylane_invoice_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button variant="outline" size="icon" disabled title="Facture Pennylane non disponible">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" onClick={() => handleResendToPennylane(statement.id)} disabled={retriggeringPennylaneId === statement.id} title="Relancer la création Pennylane">
                              {retriggeringPennylaneId === statement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(statement.id)} title="Supprimer le relevé"><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} />
                    </PaginationItem>
                    {getPaginationItems().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => setCurrentPage(page as number)}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
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