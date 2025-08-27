import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { getAllReviewReplies, updateReviewReplyStatus, ReviewReplyWithProfile } from '@/lib/admin-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminReviewRepliesPage: React.FC = () => {
  const [replies, setReplies] = useState<ReviewReplyWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllReviewReplies();
      setReplies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleUpdateStatus = async (replyId: string, status: 'approved' | 'rejected') => {
    setUpdatingIds(prev => new Set(prev).add(replyId));
    try {
      await updateReviewReplyStatus(replyId, status);
      toast.success(`Réponse ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès.`);
      await fetchReplies(); // Refresh the list
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(replyId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejetée</Badge>;
      case 'pending_approval':
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const renderSkeletons = () => (
    [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gestion des Réponses aux Avis</h1>
        <Card>
          <CardHeader>
            <CardTitle>Réponses en attente et traitées</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Réponse</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? renderSkeletons() : (
                  replies.map(reply => {
                    const isUpdating = updatingIds.has(reply.id);
                    return (
                      <TableRow key={reply.id}>
                        <TableCell>{reply.profiles?.first_name} {reply.profiles?.last_name}</TableCell>
                        <TableCell className="max-w-sm">
                          <p className="truncate" title={reply.reply_content}>{reply.reply_content}</p>
                          <p className="text-xs text-muted-foreground mt-1">ID Avis: {reply.review_id}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(reply.status)}</TableCell>
                        <TableCell>{format(new Date(reply.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>
                          {reply.status === 'pending_approval' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleUpdateStatus(reply.id, 'approved')}
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateStatus(reply.id, 'rejected')}
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {!loading && replies.length === 0 && (
              <p className="text-center text-gray-500 py-8">Aucune réponse à modérer pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReviewRepliesPage;