import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { getMigrationProgress, updateMigrationProgress, migrationSteps, type MigrationProgress } from "@/lib/migration-api";

export default function AdminMigrationProgress() {
  const [migration, setMigration] = useState<MigrationProgress | null>(null);
  const [percentage, setPercentage] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMigrationProgress();
      setMigration(data);
      setPercentage(String(data.progress));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la progression.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const value = Number(percentage);
  const valid = percentage.trim() !== "" && Number.isInteger(value) && value >= 0 && value <= 100;

  const save = async () => {
    if (!migration || !valid) return;
    setSaving(true);
    try {
      const data = await updateMigrationProgress({
        progress: value,
        backup_completed: migration.backup_completed,
        housing_transferred: migration.housing_transferred,
        owners_transferred: migration.owners_transferred,
        reservations_transferred: migration.reservations_transferred,
        upcoming_reservations_verified: migration.upcoming_reservations_verified,
        rates_availability_synced: migration.rates_availability_synced,
        ota_connected: migration.ota_connected,
        financial_documents_transferred: migration.financial_documents_transferred,
        tests_completed: migration.tests_completed,
        platform_reopened: migration.platform_reopened,
      });
      setMigration(data);
      queryClient.setQueryData(["migration-progress"], data);
      toast.success("Progression publiée sur la page de maintenance.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d’enregistrer la progression.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle>Progression de la migration</CardTitle>
        <p className="text-sm text-muted-foreground">Le pourcentage et les étapes sont indépendants. Les modifications sont visibles par les clients après publication, sous 30 secondes.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && <p role="status" className="text-sm text-muted-foreground">Chargement…</p>}
        {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Réessayer</Button></div>}
        {!loading && !error && migration && (
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-70">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="migration-percentage">Avancement global (%)</Label>
                <Input id="migration-percentage" type="number" min={0} max={100} step={1} value={percentage} onChange={(event) => setPercentage(event.target.value)} className="w-24" />
              </div>
              <Slider aria-label="Avancement global de la migration" min={0} max={100} step={1} value={[valid ? value : 0]} onValueChange={([next]) => setPercentage(String(next))} />
              <Progress value={valid ? value : 0} aria-label="Aperçu de la progression" aria-valuenow={valid ? value : 0} className="h-2 bg-red-100 [&>div]:bg-red-600" />
              {!valid && <p className="text-xs text-destructive">Saisissez un nombre entier entre 0 et 100.</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {migrationSteps.map((step) => (
                <div key={step.key} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox id={`migration-${step.key}`} checked={migration[step.key]} onCheckedChange={(checked) => setMigration({ ...migration, [step.key]: checked === true })} />
                  <Label htmlFor={`migration-${step.key}`} className="cursor-pointer leading-relaxed">{step.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">La case « Plateforme propriétaire réouverte » est informative : elle ne désactive ni la page de maintenance ni le verrou des connexions.</p>
            <Button onClick={() => void save()} disabled={!valid || saving}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? "Publication…" : "Publier la progression"}
            </Button>
            <p className="text-xs text-muted-foreground">Dernière publication : {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris).</p>
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}
