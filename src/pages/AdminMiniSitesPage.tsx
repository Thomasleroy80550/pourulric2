import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, LayoutTemplate, Search } from "lucide-react";
import AdminMiniSitesTable from "@/components/admin/AdminMiniSitesTable";
import { getAdminMiniSites, MiniSite } from "@/lib/mini-site-api";
import { getAdminDomainRequests } from "@/lib/domain-request-api";

const AdminMiniSitesPage = () => {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<MiniSite[]>([]);
  const [search, setSearch] = useState("");
  const [domainRequestCounts, setDomainRequestCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [miniSites, domainRequests] = await Promise.all([getAdminMiniSites(), getAdminDomainRequests()]);
        setSites(miniSites);
        setDomainRequestCounts(
          domainRequests.reduce<Record<string, number>>((acc, request) => {
            acc[request.mini_site_id] = (acc[request.mini_site_id] || 0) + 1;
            return acc;
          }, {}),
        );
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement des mini-sites.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredSites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sites;
    }

    return sites.filter((site) => {
      const clientName = `${site.profiles?.first_name || ""} ${site.profiles?.last_name || ""}`.toLowerCase();
      const email = (site.profiles?.email || "").toLowerCase();
      return [site.site_name, site.slug, site.custom_domain || "", clientName, email]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [search, sites]);

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <LayoutTemplate className="h-7 w-7" />
              Mini-sites clients
            </h1>
            <p className="text-muted-foreground">Suivez les brouillons, publications et slugs publics des mini-sites.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total mini-sites</CardDescription>
              <CardTitle>{sites.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Mini-sites publiés</CardDescription>
              <CardTitle>{sites.filter((site) => site.status === "published").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Demandes de domaine liées</CardDescription>
              <CardTitle>{Object.values(domainRequestCounts).reduce((sum, count) => sum + count, 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtrer par client ou slug
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom du client, email, slug, domaine..." />
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <AdminMiniSitesTable
            sites={filteredSites}
            domainRequestCounts={domainRequestCounts}
            onUpdated={(updatedSite) => {
              setSites((prev) => prev.map((site) => (site.id === updatedSite.id ? updatedSite : site)));
              toast.success("Mini-site mis à jour.");
            }}
          />
        )}

        {!loading && filteredSites.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Aucun mini-site trouvé
              </CardTitle>
              <CardDescription>Ajustez votre recherche ou attendez les premières créations côté client.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminMiniSitesPage;
