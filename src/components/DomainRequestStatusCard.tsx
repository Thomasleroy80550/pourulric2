import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainRequest, DomainRequestStatus, getDomainRequestStatusLabel } from "@/lib/domain-request-api";
import { Clock3, Globe, CheckCircle2, XCircle, Wrench } from "lucide-react";

interface DomainRequestStatusCardProps {
  request: DomainRequest;
}

function getStatusMeta(status: DomainRequestStatus) {
  switch (status) {
    case "submitted":
      return {
        icon: Clock3,
        badgeClassName: "bg-blue-100 text-blue-700 hover:bg-blue-100",
        description: "Votre demande est bien enregistrée et sera examinée par notre équipe.",
      };
    case "in_progress":
      return {
        icon: Wrench,
        badgeClassName: "bg-amber-100 text-amber-700 hover:bg-amber-100",
        description: "Nous vérifions la disponibilité et préparons la configuration.",
      };
    case "reserved":
      return {
        icon: CheckCircle2,
        badgeClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
        description: "Le domaine a été réservé. La configuration est la prochaine étape.",
      };
    case "configured":
      return {
        icon: Globe,
        badgeClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
        description: "Le domaine final est configuré et prêt à être utilisé.",
      };
    case "rejected":
      return {
        icon: XCircle,
        badgeClassName: "bg-rose-100 text-rose-700 hover:bg-rose-100",
        description: "Le domaine demandé n’a pas pu être retenu. Consultez les notes ci-dessous.",
      };
    default:
      return {
        icon: Clock3,
        badgeClassName: "bg-slate-100 text-slate-700 hover:bg-slate-100",
        description: "Statut en attente de mise à jour.",
      };
  }
}

const DomainRequestStatusCard = ({ request }: DomainRequestStatusCardProps) => {
  const meta = getStatusMeta(request.status);
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon className="h-5 w-5" />
              Suivi de la demande domaine
            </CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
          <Badge className={meta.badgeClassName}>{getDomainRequestStatusLabel(request.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-slate-50 p-4">
          <div className="text-sm text-muted-foreground">Domaine demandé</div>
          <div className="mt-1 font-medium">{request.requested_domain}</div>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <div className="text-sm text-muted-foreground">Domaine final</div>
          <div className="mt-1 font-medium">{request.final_domain || "En attente"}</div>
        </div>

        {request.alternative_domains.length > 0 ? (
          <div className="rounded-xl border bg-slate-50 p-4 md:col-span-2">
            <div className="text-sm text-muted-foreground">Variantes proposées</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {request.alternative_domains.map((domain) => (
                <Badge key={domain} variant="secondary">
                  {domain}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {request.notes ? (
          <div className="rounded-xl border bg-slate-50 p-4 md:col-span-2">
            <div className="text-sm text-muted-foreground">Votre commentaire</div>
            <div className="mt-1 whitespace-pre-line text-sm">{request.notes}</div>
          </div>
        ) : null}

        {request.admin_notes ? (
          <div className="rounded-xl border bg-slate-50 p-4 md:col-span-2">
            <div className="text-sm text-muted-foreground">Retour de l&apos;équipe</div>
            <div className="mt-1 whitespace-pre-line text-sm">{request.admin_notes}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DomainRequestStatusCard;
