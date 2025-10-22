import React, { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { createHousekeepingNote, getMyHousekeepingNotes, HousekeepingNote } from "@/lib/housekeeping-notes-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RoomSelectorCombobox, { RoomOption } from "@/components/RoomSelectorCombobox";
import HousekeepingMediaUploader from "@/components/HousekeepingMediaUploader";
import { uploadFiles } from "@/lib/storage-api";
import { supabase } from "@/integrations/supabase/client";

const HousekeepingReportsPage: React.FC = () => {
  const { profile } = useSession();
  const queryClient = useQueryClient();

  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);
  const [cleaningDate, setCleaningDate] = useState<string>("");
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const { data: myNotes = [] } = useQuery({
    queryKey: ["myHousekeepingNotes"],
    queryFn: getMyHousekeepingNotes,
    enabled: !!profile && profile.role === "housekeeper",
  });

  const { mutate: submitNote, isPending } = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non authentifié.");
      }

      // Upload des médias si présents
      let uploadedUrls: string[] = [];
      if (mediaFiles.length > 0) {
        const basePath = `notes/${user.id}/${Date.now()}`;
        uploadedUrls = await uploadFiles(mediaFiles, "housekeeping-notes", basePath);
      }

      return createHousekeepingNote({
        room_id: selectedRoom?.id_room?.toString() || "",
        room_name: selectedRoom?.label || undefined,
        content: content.trim(),
        cleaning_date: cleaningDate || undefined,
        photos: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Note créée avec succès.");
      setContent("");
      setCleaningDate("");
      setMediaFiles([]);
      setSelectedRoom(null);
      queryClient.invalidateQueries({ queryKey: ["myHousekeepingNotes"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Impossible de créer la note.");
    },
  });

  if (!profile) {
    return (
      <MainLayout>
        <div className="py-10 text-center text-muted-foreground">Chargement du profil...</div>
      </MainLayout>
    );
  }

  if (profile.role !== "housekeeper") {
    return (
      <MainLayout>
        <div className="py-10 text-center">
          <h1 className="text-2xl font-semibold">Accès réservé</h1>
          <p className="text-muted-foreground mt-2">
            Cette page est réservée au personnel de ménage. Contactez un administrateur pour obtenir l'accès.
          </p>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      toast.error("Veuillez sélectionner un logement.");
      return;
    }
    if (!content.trim()) {
      toast.error("Veuillez renseigner la note de passage.");
      return;
    }
    submitNote();
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Rapports ménage</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Saisissez une note de passage pour un logement, ajoutez des photos/vidéos, et enregistrez votre rapport.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer une note</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Logement</Label>
                <RoomSelectorCombobox
                  value={selectedRoom}
                  onChange={setSelectedRoom}
                  placeholder="Choisir un logement (avec recherche)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cleaningDate">Date de passage (optionnel)</Label>
                  <Input
                    id="cleaningDate"
                    type="date"
                    value={cleaningDate}
                    onChange={(e) => setCleaningDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content">Note de passage</Label>
                <Textarea
                  id="content"
                  placeholder="Ex: Ménage effectué. Lave-vaisselle à détartrer. Ampoule du salon à remplacer."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </div>

              <div>
                <Label>Médias (photos/vidéos)</Label>
                <HousekeepingMediaUploader files={mediaFiles} onChange={setMediaFiles} />
                <p className="text-xs text-muted-foreground mt-2">
                  Conseil: limitez la taille des vidéos pour un téléversement plus rapide. Les fichiers seront stockés et accessibles aux propriétaires.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Envoi..." : "Enregistrer la note"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes dernières notes</CardTitle>
          </CardHeader>
          <CardContent>
            {myNotes.length === 0 ? (
              <p className="text-muted-foreground">Aucune note pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {myNotes.map((note: HousekeepingNote) => (
                  <div key={note.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{note.room_name || `Room ${note.room_id}`}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    {note.cleaning_date && (
                      <div className="text-sm text-muted-foreground">
                        Passage: {new Date(note.cleaning_date).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    <div className="mt-2 text-sm whitespace-pre-wrap">{note.content}</div>
                    {Array.isArray((note as any).photos) && (note as any).photos.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(note as any).photos.map((url: string, idx: number) => (
                          <div key={idx} className="relative">
                            {/* Affiche une image si c'est une image, sinon une vidéo */}
                            {url.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                              <video src={url} className="w-full rounded-md" controls />
                            ) : (
                              <img src={url} alt={`media-${idx}`} className="w-full rounded-md" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HousekeepingReportsPage;