import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, Info, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  LmnpFixedAsset,
  LMNP_ASSET_CATEGORIES,
  addLmnpFixedAsset,
  deleteLmnpFixedAsset,
} from "@/lib/lmnp-api";
import { AmortizationRow } from "@/lib/lmnp-engine";

const assetSchema = z.object({
  label: z.string().min(2, "Le libellé est trop court."),
  category: z.string().min(1, "La catégorie est requise."),
  acquisition_date: z.string().min(1, "La date est requise."),
  amount: z.coerce.number().min(1, "Le montant doit être supérieur à 0."),
  duration_years: z.coerce.number().int().min(1, "Minimum 1 an.").max(50, "Maximum 50 ans."),
});

interface Props {
  assets: LmnpFixedAsset[];
  amortizationRows: AmortizationRow[];
  year: number;
  onChanged: () => void;
}

const formatEuro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const LmnpAssetsTab: React.FC<Props> = ({ assets, amortizationRows, year, onChanged }) => {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<z.infer<typeof assetSchema>>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      label: "",
      category: "",
      acquisition_date: new Date().toISOString().split("T")[0],
      amount: undefined,
      duration_years: undefined,
    },
  });

  const onCategoryChange = (value: string) => {
    form.setValue("category", value);
    const def = LMNP_ASSET_CATEGORIES.find((c) => c.value === value);
    if (def && !form.getValues("duration_years")) {
      form.setValue("duration_years", def.defaultYears);
    }
  };

  const onSubmit = async (values: z.infer<typeof assetSchema>) => {
    try {
      await addLmnpFixedAsset(values as Parameters<typeof addLmnpFixedAsset>[0]);
      toast.success("Immobilisation ajoutée !");
      form.reset({
        label: "",
        category: "",
        acquisition_date: new Date().toISOString().split("T")[0],
        amount: undefined,
        duration_years: undefined,
      });
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLmnpFixedAsset(deleteTarget);
      toast.success("Immobilisation supprimée.");
      setDeleteTarget(null);
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const amortByAsset = new Map(amortizationRows.map((r) => [r.assetId, r]));

  return (
    <div className="mt-6 space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Comment déclarer vos immobilisations ?</AlertTitle>
        <AlertDescription>
          Le terrain n'est pas amortissable : pour un bien immobilier, saisissez uniquement la part « bâti »
          (généralement 80 à 90 % du prix d'achat). Les meubles et travaux de plus de 600 € doivent être
          immobilisés plutôt que passés en charges.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Ajouter une immobilisation</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="label" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Libellé</FormLabel>
                      <FormControl><Input placeholder="Ex : Appartement (part bâti)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={onCategoryChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {LMNP_ASSET_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.value} ({c.defaultYears} ans)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="acquisition_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'acquisition / mise en service</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="duration_years" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée d'amortissement (années)</FormLabel>
                      <FormControl><Input type="number" min={1} max={50} {...field} /></FormControl>
                      <FormDescription>Pré-remplie selon la catégorie, ajustable.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter l'immobilisation
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Plan d'amortissement {year}</CardTitle>
              <CardDescription>Dotations calculées automatiquement (linéaire, prorata temporis).</CardDescription>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 font-medium">Aucune immobilisation</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Ajoutez votre bien, vos travaux et votre mobilier pour bénéficier des amortissements.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Immobilisation</TableHead>
                        <TableHead>Acquisition</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Dotation {year}</TableHead>
                        <TableHead className="text-right">VNC 31/12</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => {
                        const row = amortByAsset.get(asset.id);
                        return (
                          <TableRow key={asset.id}>
                            <TableCell>
                              <p className="font-medium">{asset.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {asset.category} · {asset.duration_years} ans
                              </p>
                            </TableCell>
                            <TableCell>{format(parseISO(asset.acquisition_date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-right">{formatEuro(asset.amount)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {row ? formatEuro(row.dotation) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {row ? formatEuro(row.netValue) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(asset.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette immobilisation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Son plan d'amortissement sera retiré de vos calculs. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LmnpAssetsTab;
