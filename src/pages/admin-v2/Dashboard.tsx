import React, { useEffect, useState } from "react";
import AdminLayoutV2 from "@/components/AdminLayoutV2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StatCard from "@/components/admin/StatCard";
import { Users, BedDouble, DollarSign, FileText, Target, Mail, Settings, Workflow, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllProfiles, getAllUserRooms, getSavedInvoices } from "@/lib/admin-api";

const AdminV2Dashboard: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [profiles, rooms, invoices] = await Promise.all([
          getAllProfiles(),
          getAllUserRooms(),
          getSavedInvoices(),
        ]);
        setTotalUsers(profiles.length);
        setTotalRooms(rooms.length);
        const revenue = invoices.reduce((acc, inv) => {
          const totals = inv.totals || {};
          const v = Number(totals.totalRevenuGenere ?? totals.total_ht ?? 0);
          return acc + (isNaN(v) ? 0 : v);
        }, 0);
        setTotalRevenue(revenue);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AdminLayoutV2>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Vue d’ensemble de votre activité — nouvelle interface (V2).</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button asChild variant="outline"><a href="/admin">Admin classique</a></Button>
            <Button asChild><a href="/admin/notifications"><Sparkles className="h-4 w-4 mr-2" /> Paramètres Notifs</a></Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Utilisateurs" value={totalUsers.toString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Total des comptes" loading={loading} />
          <StatCard title="Logements" value={totalRooms.toString()} icon={<BedDouble className="h-4 w-4 text-muted-foreground" />} description="Propriétés actives" loading={loading} />
          <StatCard title="Revenus (HT)" value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRevenue)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} description="Somme des relevés" loading={loading} />
          <StatCard title="À traiter" value="—" icon={<Target className="h-4 w-4 text-muted-foreground" />} description="Bientôt: tâches à prioriser" loading={false} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Raccourcis</CardTitle>
            <CardDescription>Accédez rapidement aux sections clés.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="secondary" className="justify-start">
              <a href="/admin-v2/users"><Users className="h-4 w-4 mr-2" /> Gérer les clients (V2)</a>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <a href="/admin/statements"><FileText className="h-4 w-4 mr-2" /> Relevés (classique)</a>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <a href="/admin/crm"><Workflow className="h-4 w-4 mr-2" /> CRM (classique)</a>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <a href="/admin/newsletter"><Mail className="h-4 w-4 mr-2" /> Newsletter</a>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <a href="/admin/settings"><Settings className="h-4 w-4 mr-2" /> Paramètres</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bienvenue dans Admin V2</CardTitle>
            <CardDescription>
              Une interface inspirée d’HubSpot: navigation latérale claire, header épuré, cartes lisibles. Nous migrerons progressivement les écrans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Sidebar persistante et responsive</li>
              <li>Header avec recherche et menu utilisateur</li>
              <li>Styles épurés avec accent orange</li>
              <li>Compatibilité mobile</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayoutV2>
  );
};

export default AdminV2Dashboard;