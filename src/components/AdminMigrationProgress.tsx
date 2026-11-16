import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { calculateMigrationProgress, getMigrationProgress, updateMigrationProgress, migrationSteps, type MigrationProgress, type MigrationStepKey, type MigrationStepValues } from "@/lib/migration-api";

type StepInputs = Record<MigrationStepKey, string>;

export default function AdminMigrationProgress() {
  const [migration, setMigration] = useState<MigrationProgress | null>(null);
  const [inputs, setInputs] = useState<StepInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMigrationProgress();
      setMigration(data);
      setInputs(Object.fromEntries(migrationSteps.map((step) => [step.key, String(data[step.key])])) as StepInputs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la progression.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const valid = !!inputs && migrationSteps.every((step) => inputs[step.key].trim() !== "" && Number.isInteger(Number(inputs[step.key])) && Number(inputs[step.key]) >= 0 && Number(inputs[step.key]) <= 100);
  const values = inputs ? Object.fromEntries(migrationSteps.map((step) => [step.key, Number(inputs[step.key])])) as MigrationStepValues : null;
  const globalProgress = valid && values ? calculateMigrationProgress(values) : null;

  const save = async () => {
    if (!values || !valid) return;
    setSaving(true);
    try {
      const data = await updateMigrationProgress(values);
      setMigration(data);
      queryClient.setQueryData(["migration-progress"], data);
      toast.success("Progression publiée. Le pourcentage global a été recalculé.");
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
        <p className="text-sm text-muted-foreground">Réglez le pourcentage de chaque étape. Le global est la moyenne des {migrationSteps.length} étapes, à poids égal, arrondie à une décimale. Les clients voient les modifications après publication, sous 30 secondes.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && <p role="status" className="text-sm text-muted-foreground">Chargement…</p>}
        {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Réessayer</Button></div>}
        {!loading && !error && migration && inputs && (
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-70">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Avancement global calculé</p><output className="text-2xl font-bold tabular-nums">{globalProgress === null ? "—" : `${globalProgress.toLocaleString("fr-FR")} %`}</output></div>
              {globalProgress !== null && <Progress value={globalProgress} aria-label="Aperçu de la progression globale" aria-valuenow={globalProgress} className="h-2 bg-red-100 [&>div]:bg-red-600" />}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {migrationSteps.map((step) => {
                const value = Number(inputs[step.key]);
                const stepValid = inputs[step.key].trim() !== "" && Number.isInteger(value) && value >= 0 && value <= 100;
                return (
                  <div key={step.key} className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={`migration-${step.key}`} className="leading-relaxed">{step.label}</Label>
                      <div className="flex shrink-0 items-center gap-1"><Input id={`migration-${step.key}`} type="number" min={0} max={100} step={1} value={inputs[step.key]} onChange={(event) => setInputs({ ...inputs, [step.key]: event.target.value })} aria-invalid={!stepValid} className="w-20" /><span className="text-xs text-muted-foreground">%</span></div>
                    </div>
                    <Slider aria-label={`Avancement : ${step.label}`} min={0} max={100} step={1} value={[stepValid ? value : 0]} onValueChange={([next]) => setInputs({ ...inputs, [step.key]: String(next) })} />
                    {!stepValid && <p className="text-xs text-destructive">Saisissez un entier entre 0 et 100.</p>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Une étape est terminée à 100 %. « Plateforme propriétaire réouverte » reste informative : elle ne désactive pas la maintenance ni le verrou des connexions.</p>
            <Button onClick={() => void save()} disabled={!valid || saving}><Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? "Publication…" : "Publier la progression"}</Button>
            <p className="text-xs text-muted-foreground">Dernière publication : {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris).</p>
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}
