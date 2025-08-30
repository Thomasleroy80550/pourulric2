import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Wrench, User, CheckCircle, Send, ArrowLeft, Clock, Tag, Shield, Paperclip, Archive, ArchiveRestore } from 'lucide-react';
import { getTechnicalReportById, updateTechnicalReport, addTechnicalReportUpdate, archiveReport, requestOwnerAction, TechnicalReport } from '@/lib/technical-reports-api';
import { uploadFiles } from '@/lib/storage-api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from '@/components/SessionContextProvider';

interface TechnicalReportDetailPageProps {
  isAdmin?: boolean;
}

const TechnicalReportDetailPage: React.FC<TechnicalReportDetailPageProps> = ({ isAdmin = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useSession();
  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUpdate, setNewUpdate] = useState('');
  const [newMediaFiles, setNewMediaFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReport = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTechnicalReportById(id);
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleResponse = async (response: 'owner_will_manage' | 'admin_will_manage') => {
    if (!id) return;
    try {
      await updateTechnicalReport(id, { status: response });
      toast.success("Votre réponse a été enregistrée.");
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleAddUpdate = async () => {
    if (!id || (!newUpdate.trim() && !newMediaFiles)) {
      toast.warning("Veuillez ajouter un message ou un fichier.");
      return;
    }
    if (!profile?.id) {
      toast.error("Impossible d'ajouter une mise à jour: utilisateur non identifié.");
      return;
    }

    try {
      let mediaUrls: string[] | null = null;
      if (newMediaFiles && newMediaFiles.length > 0) {
        const folderPath = `report_updates/${id}`;
        mediaUrls = await uploadFiles(newMediaFiles, 'technical_report_media', folderPath);
      }

      await addTechnicalReportUpdate({
        report_id: id,
        user_id: profile.id,
        content: newUpdate.trim(),
        media_urls: mediaUrls,
      });
      toast.success("Mise à jour ajoutée.");
      setNewUpdate('');
      setNewMediaFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await updateTechnicalReport(id, { status: 'resolved', resolved_at: new Date().toISOString() });
      toast.success("Rapport marqué comme résolu.");
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleOwnerResolve = async () => {
    if (!id || !profile?.id) return;
    try {
      await addTechnicalReportUpdate({
        report_id: id,
        user_id: profile.id,
        content: "Le propriétaire a marqué ce rapport comme résolu.",
        media_urls: null,
      });
      await updateTechnicalReport(id, { status: 'resolved', resolved_at: new Date().toISOString() });
      toast.success("Rapport marqué comme résolu.");
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleArchiveToggle = async () => {
    if (!id || report === null) return;
    try {
      if (report.is_archived) {
        await updateTechnicalReport(id, { is_archived: false, status: 'pending_owner_action' });
        toast.success(`Rapport désarchivé avec succès !`);
      } else {
        await archiveReport(id);
        toast.success(`Rapport archivé avec succès !`);
      }
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleRequestOwnerAction = async () => {
    if (!id || !profile?.id) return;
    try {
      await requestOwnerAction(id, profile.id);
      toast.success("Demande d'action envoyée au propriétaire.");
      fetchReport();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_owner_action': return <Badge variant="secondary">Action requise</Badge>;
      case 'owner_will_manage': return <Badge variant="outline">Géré par proprio</Badge>;
      case 'admin_will_manage': return <Badge>Géré par Hello Keys</Badge>;
      case 'resolved': return <Badge className="bg-green-600 text-white">Résolu</Badge>;
      case 'archived': return <Badge variant="destructive">Archivé</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'low': return <Badge variant="outline">Basse</Badge>;
      case 'medium': return <Badge variant="secondary">Moyenne</Badge>;
      case 'high': return <Badge>Haute</Badge>;
      case 'urgent': return <Badge variant="destructive">Urgente</Badge>;
      default: return null;
    }
  };

  const Layout = isAdmin ? AdminLayout : MainLayout;

  const renderContent = () => {
    if (loading) return <Skeleton className="h-96 w-full" />;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!report) return <p>Rapport non trouvé.</p>;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{report.title}</CardTitle>
                  <CardDescription>{report.property_name}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(report.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{report.description}</p>
            </CardContent>
          </Card>

          {report.media_urls && report.media_urls.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center"><Paperclip className="h-5 w-5 mr-2" />Pièces Jointes Initiales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {report.media_urls.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                    <img src={url} alt={`Pièce jointe ${index + 1}`} className="w-full h-32 object-cover" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Fil de discussion</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Ensure technical_report_updates is an array before mapping */}
              {Array.isArray(report.technical_report_updates) && report.technical_report_updates.map(update => (
                <div key={update.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">{update.profiles?.role === 'admin' ? <Shield className="h-5 w-5 text-blue-500" /> : <User className="h-5 w-5 text-gray-500" />}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{update.profiles?.first_name} {update.profiles?.last_name}</p>
                      <p className="text-xs text-gray-500">{format(new Date(update.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</p>
                    </div>
                    {update.content && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{update.content}</p>}
                    {update.media_urls && update.media_urls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {update.media_urls.map((url, index) => (
                          <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                            <img src={url} alt={`Média ${index + 1}`} className="w-full h-24 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {report.status !== 'resolved' && report.status !== 'archived' && (
                <div className="pt-4 border-t space-y-2">
                  <Textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Ajouter une mise à jour..." />
                  <Input type="file" multiple onChange={(e) => setNewMediaFiles(e.target.files)} ref={fileInputRef} />
                  <Button onClick={handleAddUpdate} className="mt-2">
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Propriétaire:</strong> {report.profiles?.first_name} {report.profiles?.last_name}</p>
              <p><strong>Créé le:</strong> {format(new Date(report.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
              <p><strong>Priorité:</strong> {getPriorityBadge(report.priority)}</p>
              <p><strong>Catégorie:</strong> <Badge variant="outline">{report.category || 'Non définie'}</Badge></p>
            </CardContent>
          </Card>
          {report.status === 'pending_owner_action' && !isAdmin && (
            <Card>
              <CardHeader><CardTitle>Votre Action</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button onClick={() => handleResponse('admin_will_manage')}><Wrench className="h-4 w-4 mr-2" />Hello Keys s'en occupe</Button>
                <Button variant="outline" onClick={() => handleResponse('owner_will_manage')}><User className="h-4 w-4 mr-2" />Je m'en occupe</Button>
              </CardContent>
            </Card>
          )}
          {report.status === 'owner_will_manage' && !isAdmin && (
            <Card>
              <CardHeader><CardTitle>Gérer le Rapport</CardTitle></CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleOwnerResolve}><CheckCircle className="h-4 w-4 mr-2" />Marquer comme résolu</Button>
              </CardContent>
            </Card>
          )}
          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>Actions Admin</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {report.status !== 'resolved' && (
                  <Button className="w-full" onClick={handleResolve}><CheckCircle className="h-4 w-4 mr-2" />Marquer comme résolu</Button>
                )}
                {report.status !== 'pending_owner_action' && report.status !== 'resolved' && report.status !== 'archived' && (
                  <Button className="w-full" onClick={handleRequestOwnerAction} variant="secondary"><User className="h-4 w-4 mr-2" />Demander action propriétaire</Button>
                )}
                <Button variant="outline" className="w-full" onClick={handleArchiveToggle}>
                  {report.is_archived ? <><ArchiveRestore className="h-4 w-4 mr-2" />Désarchiver</> : <><Archive className="h-4 w-4 mr-2" />Archiver</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Button variant="ghost" onClick={() => navigate(isAdmin ? '/admin/technical-reports' : '/reports')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour à la liste
      </Button>
      {renderContent()}
    </Layout>
  );
};

export default TechnicalReportDetailPage;