import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, Pencil } from "lucide-react";
import { MiniSite, MiniSiteStatus, updateAdminMiniSite } from "@/lib/mini-site-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface AdminMiniSitesTableProps {
  sites: MiniSite[];
  domainRequestCounts: Record<string, number>;
  onUpdated: (site: MiniSite) => void;
}

const AdminMiniSitesTable = ({ sites, domainRequestCounts, onUpdated }: AdminMiniSitesTableProps) => {
  const [editingSite, setEditingSite] = useState<MiniSite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({
    site_name: "",
    slug: "",
    status: "draft" as MiniSiteStatus,
    custom_domain: "",
    hero_title: "",
    slogan: "",
    contact_email: "",
    contact_phone: "",
    seo_title: "",
    seo_description: "",
  });

  const rows = useMemo(() => sites, [sites]);

  const openEdit = (site: MiniSite) => {
    setEditingSite(site);
    setFormState({
      site_name: site.site_name,
      slug: site.slug,
      status: site.status,
      custom_domain: site.custom_domain || "",
      hero_title: site.hero_title || "",
      slogan: site.slogan || "",
      contact_email: site.contact_email || "",
      contact_phone: site.contact_phone || "",
      seo_title: site.seo_title || "",
      seo_description: site.seo_description || "",
    });
  };

  const handleSave = async () => {
    if (!editingSite) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateAdminMiniSite(editingSite.id, formState);
      onUpdated({
        ...updated,
        profiles: editingSite.profiles,
      });
      setEditingSite(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Mini-site</TableHead>
              <TableHead>Slug public</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Domaine</TableHead>
              <TableHead>Demandes</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((site) => (
              <TableRow key={site.id}>
                <TableCell>
                  <div className="font-medium">{site.profiles?.first_name || "Client"} {site.profiles?.last_name || ""}</div>
                  <div className="text-sm text-muted-foreground">{site.profiles?.email || "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{site.site_name}</div>
                  <div className="text-sm text-muted-foreground">{site.hero_title || site.slogan || "Sans accroche"}</div>
                </TableCell>
                <TableCell>/sites/{site.slug}</TableCell>
                <TableCell>
                  <Badge variant={site.status === "published" ? "default" : "secondary"}>
                    {site.status === "published" ? "Publié" : "Brouillon"}
                  </Badge>
                </TableCell>
                <TableCell>{site.custom_domain || "—"}</TableCell>
                <TableCell>{domainRequestCounts[site.id] || 0}</TableCell>
                <TableCell>{format(new Date(site.updated_at), "dd MMM yyyy HH:mm", { locale: fr })}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {site.status === "published" ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={`/sites/${site.slug}`} target="_blank" rel="noreferrer noopener">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => openEdit(site)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingSite} onOpenChange={(open) => !open && setEditingSite(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le mini-site</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom du site</Label>
              <Input value={formState.site_name} onChange={(event) => setFormState((prev) => ({ ...prev, site_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={formState.slug} onChange={(event) => setFormState((prev) => ({ ...prev, slug: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={formState.status} onValueChange={(value: MiniSiteStatus) => setFormState((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Domaine final</Label>
              <Input value={formState.custom_domain} onChange={(event) => setFormState((prev) => ({ ...prev, custom_domain: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Hero title</Label>
              <Input value={formState.hero_title} onChange={(event) => setFormState((prev) => ({ ...prev, hero_title: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Slogan</Label>
              <Input value={formState.slogan} onChange={(event) => setFormState((prev) => ({ ...prev, slogan: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input value={formState.contact_email} onChange={(event) => setFormState((prev) => ({ ...prev, contact_email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={formState.contact_phone} onChange={(event) => setFormState((prev) => ({ ...prev, contact_phone: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>SEO title</Label>
              <Input value={formState.seo_title} onChange={(event) => setFormState((prev) => ({ ...prev, seo_title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Textarea value={formState.seo_description} onChange={(event) => setFormState((prev) => ({ ...prev, seo_description: event.target.value }))} rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSite(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMiniSitesTable;
