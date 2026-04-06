import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { getAllProfiles, getAllUserRooms, updateUser } from "@/lib/admin-api";

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  property_address?: string | null;
  property_city?: string | null;
  property_zip_code?: string | null;
  agency?: string | null;
  contract_start_date?: string | null;
  pennylane_customer_id?: string | null;
};

const AdminPennylaneMissingPage: React.FC = () => {
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [roomsByUser, setRoomsByUser] = React.useState<Record<string, string[]>>({});
  const [selectedProfile, setSelectedProfile] = React.useState<ProfileRow | null>(null);

  const loadProfiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const [allProfiles, allRooms] = await Promise.all([getAllProfiles(), getAllUserRooms()]);

      const missing = (allProfiles as ProfileRow[])
        .filter((profile) => !profile.pennylane_customer_id?.toString().trim())
        .sort((a, b) => {
          const aName = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
          const bName = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
          return aName.localeCompare(bName, "fr", { sensitivity: "base" });
        });

      const nextInputs: Record<string, string> = {};
      missing.forEach((profile) => {
        nextInputs[profile.id] = "";
      });

      const nextRoomsByUser: Record<string, string[]> = {};
      allRooms.forEach((room) => {
        if (!nextRoomsByUser[room.user_id]) {
          nextRoomsByUser[room.user_id] = [];
        }
        if (room.room_name) {
          nextRoomsByUser[room.user_id].push(room.room_name);
        }
      });

      setProfiles(missing);
      setInputs(nextInputs);
      setRoomsByUser(nextRoomsByUser);
      setSelectedProfile((current) => current ? missing.find((profile) => profile.id === current.id) ?? null : null);
    } catch (error: any) {
      toast.error(`Erreur de chargement : ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const filteredProfiles = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;

    return profiles.filter((profile) => {
      const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim().toLowerCase();
      const email = (profile.email ?? "").toLowerCase();
      const rooms = (roomsByUser[profile.id] ?? []).join(" ").toLowerCase();
      return fullName.includes(query) || email.includes(query) || rooms.includes(query);
    });
  }, [profiles, roomsByUser, search]);

  const handleSave = async (profile: ProfileRow) => {
    const pennylaneCustomerId = (inputs[profile.id] ?? "").trim();

    if (!pennylaneCustomerId) {
      toast.error("Veuillez saisir un ID Pennylane.");
      return;
    }

    setSavingId(profile.id);
    try {
      await updateUser({ user_id: profile.id, pennylane_customer_id: pennylaneCustomerId });
      toast.success("ID Pennylane enregistré.");
      setProfiles((current) => current.filter((item) => item.id !== profile.id));
      setSelectedProfile((current) => (current?.id === profile.id ? null : current));
    } catch (error: any) {
      toast.error(`Erreur lors de l'enregistrement : ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const fullName = (profile: ProfileRow) => `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Sans nom";

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-6xl">
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>IDs Pennylane manquants</CardTitle>
              <CardDescription>
                Retrouvez rapidement les clients sans ID Pennylane renseigné et complétez-le directement ici.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un client ou un logement..."
                className="sm:w-80"
              />
              <Button variant="outline" onClick={loadProfiles}>
                Rafraîchir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Chargement des profils..."
                  : `${filteredProfiles.length} client${filteredProfiles.length > 1 ? "s" : ""} sans ID Pennylane`}
              </p>
              {!loading && profiles.length > 0 && (
                <Badge variant="secondary">Total manquants : {profiles.length}</Badge>
              )}
            </div>

            {loading ? (
              <div className="h-32 rounded-md border bg-muted animate-pulse" />
            ) : filteredProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {profiles.length === 0
                  ? "Tous les clients ont un ID Pennylane renseigné. 🎉"
                  : "Aucun client ne correspond à votre recherche."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Logements</TableHead>
                      <TableHead>ID Pennylane</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedProfile(profile)}
                              title="Voir les informations du client"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <span>{fullName(profile)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{profile.email || "—"}</TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="flex flex-wrap gap-1">
                            {(roomsByUser[profile.id] ?? []).length > 0 ? (
                              roomsByUser[profile.id].map((roomName) => (
                                <Badge key={roomName} variant="outline" className="max-w-[180px] truncate">
                                  {roomName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[260px]">
                          <Input
                            value={inputs[profile.id] ?? ""}
                            onChange={(event) =>
                              setInputs((current) => ({
                                ...current,
                                [profile.id]: event.target.value,
                              }))
                            }
                            placeholder="ex: 123456"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button onClick={() => handleSave(profile)} disabled={savingId === profile.id}>
                            {savingId === profile.id ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informations client</DialogTitle>
              <DialogDescription>
                Vérifiez ces informations avant de créer le client dans Pennylane.
              </DialogDescription>
            </DialogHeader>

            {selectedProfile && (
              <div className="grid gap-4 text-sm">
                <div className="grid gap-3 rounded-lg border p-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Nom</div>
                    <div className="font-medium">{fullName(selectedProfile)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                    <div>{selectedProfile.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Téléphone</div>
                    <div>{selectedProfile.phone_number || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Adresse</div>
                    <div>
                      {selectedProfile.property_address
                        ? `${selectedProfile.property_address}${selectedProfile.property_zip_code || selectedProfile.property_city ? ", " : ""}${selectedProfile.property_zip_code ?? ""} ${selectedProfile.property_city ?? ""}`.trim()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Agence</div>
                    <div>{selectedProfile.agency || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Début de contrat</div>
                    <div>{selectedProfile.contract_start_date || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Logements</div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(roomsByUser[selectedProfile.id] ?? []).length > 0 ? (
                        roomsByUser[selectedProfile.id].map((roomName) => (
                          <Badge key={roomName} variant="secondary">
                            {roomName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPennylaneMissingPage;