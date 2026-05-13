import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DomainRequest, DomainRequestStatus, getDomainRequestStatusLabel, updateDomainRequestStatus } from "@/lib/domain-request-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface AdminDomainRequestsTableProps {
  requests: DomainRequest[];
  onUpdated: (request: DomainRequest) => void;
}

const statuses: DomainRequestStatus[] = ["submitted", "in_progress", "reserved", "configured", "rejected"];

const AdminDomainRequestsTable = ({ requests, onUpdated }: AdminDomainRequestsTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, { status: DomainRequestStatus; final_domain: string; admin_notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const getValues = (request: DomainRequest) => {
    return (
      formState[request.id] || {
        status: request.status,
        final_domain: request.final_domain || "",
        admin_notes: request.admin_notes || "",
      }
    );
  };

  const updateValues = (id: string, values: Partial<{ status: DomainRequestStatus; final_domain: string; admin_notes: string }>) => {
    setFormState((prev) => ({
      ...prev,
      [id]: {
        ...getValues(requests.find((request) => request.id === id) as DomainRequest),
        ...prev[id],
        ...values,
      },
    }));
  };

  const handleSave = async (request: DomainRequest) => {
    const values = getValues(request);
    setIsSaving(true);
    try {
      const updated = await updateDomainRequestStatus(request.id, values);
      onUpdated({
        ...updated,
        profiles: request.profiles,
        mini_sites: request.mini_sites,
      });
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour de la demande.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Mini-site</TableHead>
            <TableHead>Domaine demandé</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Domaine final</TableHead>
            <TableHead>Notes admin</TableHead>
            <TableHead>Créée le</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const values = getValues(request);
            const isEditing = editingId === request.id;

            return (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="font-medium">{request.profiles?.first_name || "Client"} {request.profiles?.last_name || ""}</div>
                  <div className="text-sm text-muted-foreground">{request.profiles?.email || "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{request.mini_sites?.site_name || "Mini-site"}</div>
                  <div className="text-sm text-muted-foreground">/sites/{request.mini_sites?.slug || "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{request.requested_domain}</div>
                  {request.alternative_domains.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {request.alternative_domains.map((domain) => (
                        <Badge key={domain} variant="secondary">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="min-w-[220px]">
                  {isEditing ? (
                    <Select value={values.status} onValueChange={(value: DomainRequestStatus) => updateValues(request.id, { status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getDomainRequestStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{getDomainRequestStatusLabel(request.status)}</Badge>
                  )}
                </TableCell>
                <TableCell className="min-w-[220px]">
                  {isEditing ? (
                    <Input value={values.final_domain} onChange={(event) => updateValues(request.id, { final_domain: event.target.value })} placeholder="exemple.fr" />
                  ) : (
                    request.final_domain || "—"
                  )}
                </TableCell>
                <TableCell className="min-w-[260px]">
                  {isEditing ? (
                    <Textarea value={values.admin_notes} onChange={(event) => updateValues(request.id, { admin_notes: event.target.value })} rows={3} />
                  ) : (
                    <div className="max-w-sm whitespace-pre-line text-sm text-muted-foreground">{request.admin_notes || "—"}</div>
                  )}
                </TableCell>
                <TableCell>{format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                        <Button size="sm" onClick={() => handleSave(request)} disabled={isSaving}>
                          {isSaving ? "..." : "Enregistrer"}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingId(request.id)}>
                        Traiter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminDomainRequestsTable;
