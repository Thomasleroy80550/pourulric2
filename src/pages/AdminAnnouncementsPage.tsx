import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, Edit, Trash2, Pin, Sparkles, Loader2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Announcement,
  AnnouncementLevel,
  createAnnouncement,
  deleteAnnouncement,
  generateAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/lib/announcements-api";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcement-levels";

const emptyForm: Partial<Announcement> = {
  title: "",
  content: "",
  level: "info",
  is_pinned: false,
  is_published: false,
};

const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Partial<Announcement>>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError(`Erreur lors du chargement des annonces : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setCurrent(emptyForm);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!current.title || !current.content) {
      toast.error("Veuillez renseigner un titre et un contenu.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing && current.id) {
        await updateAnnouncement({
          id: current.id,
          title: current.title,
          content: current.content,
          level: current.level as AnnouncementLevel,
          is_pinned: current.is_pinned,
          is_published: current.is_published,
        });
        toast.success("Annonce mise à jour !");
      } else {
        await createAnnouncement({
          title: current.title!,
          content: current.content!,
          level: current.level as AnnouncementLevel,
          is_pinned: current.is_pinned,
          is_published: current.is_published,
        });
        toast.success("Annonce créée !");
      }
      resetForm();
      await fetchAnnouncements();
    } catch (err: any) {
      setError(`Erreur lors de la sauvegarde : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.error("Décrivez le sujet de l'annonce à générer.");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateAnnouncement(
        aiTopic.trim(),
        (current.level as AnnouncementLevel) || "info",
      );
      setCurrent((p) => ({
        ...p,
        title: result.title || p.title,
        content: result.content || p.content,
      }));
      toast.success("Annonce générée ! Vous pouvez la relire et l'ajuster avant de publier.");
    } catch (err: any) {
      toast.error(`Erreur IA : ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setCurrent(announcement);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette annonce ?")) return;
    setLoading(true);
    try {
      await deleteAnnouncement(id);
      toast.success("Annonce supprimée.");
      await fetchAnnouncements();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">Annonces</h1>
        <p className="text-muted-foreground mb-6">
          Publiez des messages visibles par tous les utilisateurs (page Annonces, bannière du tableau de bord et pastille « non lu »).
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md dark:border-purple-900/40 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Générer avec l'IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="ai-topic">Décrivez le sujet de l'annonce</Label>
            <Textarea
              id="ai-topic"
              placeholder="Ex: Maintenance de la plateforme dimanche soir de 22h à 23h, pas d'accès aux réservations pendant cette période."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              disabled={generating}
              rows={3}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer l'annonce
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Le titre et le contenu ci-dessous seront pré-remplis. Relisez avant de publier.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {isEditing ? "Modifier l'annonce" : "Rédiger une nouvelle annonce"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                placeholder="Ex: Maintenance prévue ce week-end"
                value={current.title || ""}
                onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Niveau d'importance</Label>
                <Select
                  value={current.level || "info"}
                  onValueChange={(value) =>
                    setCurrent((p) => ({ ...p, level: value as AnnouncementLevel }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ANNOUNCEMENT_LEVELS) as AnnouncementLevel[]).map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {ANNOUNCEMENT_LEVELS[lvl].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_pinned"
                    checked={!!current.is_pinned}
                    onCheckedChange={(checked) => setCurrent((p) => ({ ...p, is_pinned: checked }))}
                    disabled={loading}
                  />
                  <Label htmlFor="is_pinned">Épingler</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_published"
                    checked={!!current.is_published}
                    onCheckedChange={(checked) => setCurrent((p) => ({ ...p, is_published: checked }))}
                    disabled={loading}
                  />
                  <Label htmlFor="is_published">Publier</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <RichTextEditor
                value={current.content || ""}
                onChange={(html) => setCurrent((p) => ({ ...p, content: html }))}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Sauvegarde…" : isEditing ? "Mettre à jour" : "Créer l'annonce"}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Annuler
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Annonces existantes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && announcements.length === 0 ? (
              <p className="text-muted-foreground">Chargement…</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground">Aucune annonce pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Publiée</TableHead>
                      <TableHead>Épinglée</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((a) => {
                      const level = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>
                            <Badge className={level.badgeClass} variant="secondary">
                              {level.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{a.is_published ? "Oui" : "Non"}</TableCell>
                          <TableCell>
                            {a.is_pinned ? <Pin className="h-4 w-4 text-orange-600" /> : "—"}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(a)} disabled={loading}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(a.id)} disabled={loading}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncementsPage;
