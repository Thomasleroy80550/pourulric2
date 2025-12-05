import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Download, FileText, WifiOff } from 'lucide-react';
import { fetchPennylaneInvoices, PennylaneInvoice } from '@/lib/pennylane-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const InvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<PennylaneInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedInvoices = await fetchPennylaneInvoices();
        setInvoices(fetchedInvoices);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'draft':
      case 'upcoming':
        return 'secondary';
      case 'late':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderError = () => {
    if (!error) return null;

    const errLower = error.toLowerCase();

    if (errLower.includes('access token is invalid')) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Clé API Pennylane invalide</AlertTitle>
          <AlertDescription>
            <p>La clé API utilisée pour contacter Pennylane est invalide ou expirée.</p>
            <p className="mt-2 text-sm">
              Un administrateur doit mettre à jour le secret PENNYLANE_API_KEY (ou PENNYLANE_API_KEYV1) dans Supabase.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    if (error.includes('error sending request')) {
      return (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Erreur de Connexion au Service de Facturation</AlertTitle>
          <AlertDescription>
            <p>Nous ne parvenons pas à contacter le service Pennylane pour le moment. Cela est probablement dû à un problème de réseau temporaire entre nos serveurs et les leurs.</p>
            <p className="mt-2 text-sm">Veuillez réessayer dans quelques instants. Si le problème persiste, il se peut qu'une intervention technique soit nécessaire au niveau de l'infrastructure.</p>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Erreur de chargement</AlertTitle>
        <AlertDescription>
          {error}
          <p className="mt-2 text-sm">Veuillez vérifier que votre ID client Pennylane est correctement configuré dans votre profil et que la clé API est valide.</p>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="mt-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Historique de facturation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            renderError()
          ) : invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune facture trouvée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{format(parseISO(invoice.date), 'dd MMMM yyyy', { locale: fr })}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{invoice.amount}€</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!invoice.file_url}
                        asChild
                      >
                        <a href={invoice.file_url || '#'} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesTab;