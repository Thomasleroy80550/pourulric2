"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getAllProfiles, UserProfile } from "@/lib/admin-api";
import { createNotification } from "@/lib/notifications-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BellRing,
  Check,
  ChevronsUpDown,
  FlaskConical,
  Loader2,
  Send,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEST_MESSAGE =
  "🔔 Notification de test Hello Keys : tout fonctionne correctement !";

const formatUserName = (p: UserProfile) => {
  const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
  return name || p.email || p.id;
};

const SendPushNotificationCard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/notifications");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAllProfiles()
      .then((data) =>
        setProfiles(
          [...data].sort((a, b) =>
            formatUserName(a).toLowerCase() > formatUserName(b).toLowerCase() ? 1 : -1
          )
        )
      )
      .catch((e: any) => toast.error(e.message || "Erreur lors du chargement des utilisateurs."))
      .finally(() => setLoadingProfiles(false));
  }, []);

  // Vérifie si l'utilisateur sélectionné a activé les push
  useEffect(() => {
    if (!selectedUserId) {
      setDeviceCount(null);
      return;
    }
    setDeviceCount(null);
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", selectedUserId)
      .then(({ count, error }) => {
        if (!error) setDeviceCount(count ?? 0);
      });
  }, [selectedUserId]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedUserId) || null,
    [profiles, selectedUserId]
  );

  const send = async (msg: string, lnk: string) => {
    if (!selectedUserId) {
      toast.error("Sélectionnez d'abord un utilisateur.");
      return;
    }
    if (!msg.trim()) {
      toast.error("Le message ne peut pas être vide.");
      return;
    }
    setSending(true);
    try {
      await createNotification(selectedUserId, msg.trim(), lnk.trim() || "/notifications");
      toast.success(
        `Notification envoyée à ${selectedProfile ? formatUserName(selectedProfile) : "l'utilisateur"}. ` +
          (deviceCount ? `Push envoyé sur ${deviceCount} appareil(s).` : "Elle apparaîtra dans son espace (pas de push : aucun appareil abonné).")
      );
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi de la notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-600" />
          Envoyer une notification (in-app + push)
        </CardTitle>
        <CardDescription>
          La notification apparaît dans l'espace client et est envoyée en push sur
          les appareils où l'utilisateur a activé les notifications. Utilisez le
          bouton « Test » pour vérifier le fonctionnement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Utilisateur</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between font-normal"
                  disabled={loadingProfiles}
                >
                  {loadingProfiles ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </span>
                  ) : selectedProfile ? (
                    formatUserName(selectedProfile)
                  ) : (
                    "Choisir un utilisateur..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un utilisateur..." />
                  <CommandList>
                    <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${formatUserName(p)} ${p.email || ""}`}
                          onSelect={() => {
                            setSelectedUserId(p.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUserId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{formatUserName(p)}</span>
                            {p.email && (
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedUserId && deviceCount !== null && (
              <Badge
                variant={deviceCount > 0 ? "default" : "secondary"}
                className="flex w-fit items-center gap-1"
              >
                <Smartphone className="h-3 w-3" />
                {deviceCount > 0
                  ? `Push activé sur ${deviceCount} appareil(s)`
                  : "Push non activé (notification in-app uniquement)"}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label>Lien (ouvert au clic sur la notification)</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/notifications"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message de notification..."
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => send(TEST_MESSAGE, "/notifications")}
            disabled={sending || !selectedUserId}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="mr-2 h-4 w-4" />
            )}
            Envoyer une notification de test
          </Button>
          <Button
            onClick={() => send(message, link)}
            disabled={sending || !selectedUserId || !message.trim()}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SendPushNotificationCard;
