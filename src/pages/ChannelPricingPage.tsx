import MainLayout from "@/components/MainLayout";
import { useSession } from "@/components/SessionContextProvider";
import ChannelPricingPlanner from "@/components/channel/ChannelPricingPlanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelPricingPage() {
  const { profile } = useSession();

  if (!profile) {
    return (
      <MainLayout>
        <div className="space-y-4 px-2 py-6 sm:px-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </MainLayout>
    );
  }

  if (profile.role !== "user" || !profile.can_manage_prices) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl py-8">
          <Alert variant="destructive">
            <AlertTitle>Accès non autorisé</AlertTitle>
            <AlertDescription>Vous n’avez pas la permission de gérer les prix. Contactez un administrateur pour activer cet accès.</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-[1800px] px-2 py-6 sm:px-4">
        <ChannelPricingPlanner />
      </div>
    </MainLayout>
  );
}
