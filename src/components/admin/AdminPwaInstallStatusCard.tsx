"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Smartphone, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { getAllPwaInstalls, PwaInstallRecord } from "@/lib/pwa-api";
import { getAllProfiles, UserProfile } from "@/lib/admin-api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const platformLabel = (p: string | null) => {
  if (p === "ios") return "iOS";
  if (p === "android") return "Android";
  if (p === "desktop") return "Desktop";
  return "—";
};

const AdminPwaInstallStatusCard: React.FC = () => {
  const [installs, setInstalls] = useState<PwaInstallRecord[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllPwaInstalls(), getAllProfiles()])
      .then(([installsData, profilesData]) => {
        setInstalls(installsData);
        setProfiles(profilesData);
      })
      .catch((e: any) => toast.error(e.message || "Erreur lors du chargement des statuts PWA."))
      .finally(() => setLoading(false));
  }, []);

  const profileById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  const installedCount = installs.filter((i) => i.is_installed).length;

  const formatName = (userId: string) => {
    const p = profileById.get(userId);
    if (!p) return userId.slice(0, 8) + "…";
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    return name || p.email || userId.slice(0, 8) + "…";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5 text-blue-600" />
          Installations de l'application (PWA)
        </CardTitle>
        <CardDescription>
          Statut d'installation de l'application par les utilisateurs.{" "}
          <strong>{installedCount}</strong> installation(s) sur{" "}
          <strong>{installs.length}</strong> utilisateur(s) détecté(s).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : installs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun statut PWA enregistré pour le moment. Les statuts apparaissent
            lorsque les utilisateurs se connectent sur la nouvelle version.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Plateforme</TableHead>
                  <TableHead>Dernière activité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installs.map((install) => (
                  <TableRow key={install.user_id}>
                    <TableCell className="font-medium">{formatName(install.user_id)}</TableCell>
                    <TableCell>
                      {install.is_installed ? (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Installée
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Non installée</Badge>
                      )}
                    </TableCell>
                    <TableCell>{platformLabel(install.platform)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {install.last_seen_at
                        ? formatDistanceToNow(new Date(install.last_seen_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPwaInstallStatusCard;
