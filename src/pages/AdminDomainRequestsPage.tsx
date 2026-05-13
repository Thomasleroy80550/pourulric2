import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Search } from "lucide-react";
import AdminDomainRequestsTable from "@/components/admin/AdminDomainRequestsTable";
import { DomainRequest, getAdminDomainRequests } from "@/lib/domain-request-api";

const AdminDomainRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getAdminDomainRequests();
        setRequests(data);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement des demandes de domaine.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return requests;
    }

    return requests.filter((request) => {
      const clientName = `${request.profiles?.first_name || ""} ${request.profiles?.last_name || ""}`.toLowerCase();
      const email = (request.profiles?.email || "").toLowerCase();
      const siteName = (request.mini_sites?.site_name || "").toLowerCase();
      const slug = (request.mini_sites?.slug || "").toLowerCase();

      return [clientName, email, siteName, slug, request.requested_domain, request.final_domain || "", request.admin_notes || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [requests, search]);

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Globe className="h-7 w-7" />
            Demandes de domaine
          </h1>
          <p className="text-muted-foreground">Consultez les demandes soumises par les clients et mettez à jour leur statut de traitement.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total</CardDescription>
              <CardTitle>{requests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>À traiter</CardDescription>
              <CardTitle>{requests.filter((request) => ["submitted", "in_progress"].includes(request.status)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Réservés / configurés</CardDescription>
              <CardTitle>{requests.filter((request) => ["reserved", "configured"].includes(request.status)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Refusés</CardDescription>
              <CardTitle>{requests.filter((request) => request.status === "rejected").length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtrer les demandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Client, domaine, slug, note..." />
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <AdminDomainRequestsTable
            requests={filteredRequests}
            onUpdated={(updatedRequest) => {
              setRequests((prev) => prev.map((request) => (request.id === updatedRequest.id ? updatedRequest : request)));
              toast.success("Demande mise à jour.");
            }}
          />
        )}

        {!loading && filteredRequests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune demande trouvée</CardTitle>
              <CardDescription>Essayez un autre filtre ou attendez les premières soumissions client.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminDomainRequestsPage;
