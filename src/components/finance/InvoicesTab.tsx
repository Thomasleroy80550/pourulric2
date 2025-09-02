import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Download, FileText, WifiOff, Hash, Calendar, Euro } from 'lucide-react';
import { fetchPennylaneInvoices, PennylaneInvoice } from '@/lib/pennylane-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const InvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<PennylaneInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (error) {
      return renderError();
    }

    if (invoices.length === 0) {
      return <p className="text-center text-gray-500 py-8">Aucune facture trouvée.</p>;
    }

    if (isMobile) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-gray-500" />
                    Facture {invoice.invoice_number}
                  </span>
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Date: {format(parseISO(invoice.date), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="flex items-center">
                  <Euro className="h-4 w-4 mr-2 text-gray-500" />
                  Montant: <span className="font-bold ml-1">{invoice.amount}€</span>
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!invoice.file_url}
                    asChild
                  >
                    <a href={invoice.file_url || '#'} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
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
                  disabled={!invoice.public_file_url}
                  asChild
                >
                  <a href={invoice.public_file_url || '#'} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesTab;