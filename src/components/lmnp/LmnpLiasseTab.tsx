import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Download, AlertTriangle, Euro, TrendingDown, Calculator, FileText } from "lucide-react";
import { LmnpComputation } from "@/lib/lmnp-engine";
import { LmnpSettings } from "@/lib/lmnp-api";
import { exportLiassePdf } from "@/lib/lmnp-pdf";

interface Props {
  computation: LmnpComputation;
  settings: LmnpSettings | null;
}

const formatEuro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const LmnpLiasseTab: React.FC<Props> = ({ computation, settings }) => {
  const summaryTiles = [
    { label: "Recettes", value: formatEuro(computation.grossRevenue), icon: Euro, hint: "Importées des relevés" },
    { label: "Charges déductibles", value: formatEuro(computation.totalExpenses), icon: TrendingDown, hint: "Hors amortissements" },
    { label: "Amortissements déduits", value: formatEuro(computation.deductibleAmortization + computation.deferredUsed), icon: Calculator, hint: "Plafonnés art. 39 C" },
    { label: "Résultat fiscal", value: formatEuro(computation.finalTaxResult), icon: FileText, hint: "Après déficits antérieurs" },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* ── Synthèse ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg bg-muted p-1.5 w-fit">
              <tile.icon className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>
            <p className="mt-3 truncate text-xl font-bold sm:text-2xl">{tile.value}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{tile.label}</p>
            <p className="truncate text-[10px] text-muted-foreground">{tile.hint}</p>
          </div>
        ))}
      </div>

      {/* ── Avertissements ── */}
      {computation.warnings.map((w, idx) => (
        <Alert key={idx}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Point d'attention</AlertTitle>
          <AlertDescription>{w}</AlertDescription>
        </Alert>
      ))}

      {/* ── Export ── */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Liasse fiscale {computation.year} — Régime réel simplifié</p>
            <p className="text-sm text-muted-foreground">
              Formulaire 2031 et annexes 2033-A à 2033-E, générés à partir de vos données.
            </p>
          </div>
          <Button onClick={() => exportLiassePdf(computation, settings)} className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Télécharger la liasse (PDF)
          </Button>
        </CardContent>
      </Card>

      {/* ── Détail des revenus importés ── */}
      {computation.revenueDetails.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenus importés automatiquement</CardTitle>
            <CardDescription>Depuis vos relevés Hello Keys de l'exercice {computation.year}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Recettes brutes</TableHead>
                  <TableHead className="text-right">Frais Hello Keys (déduits en charges)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {computation.revenueDetails.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="capitalize">{r.period}</TableCell>
                    <TableCell className="text-right">{formatEuro(r.gross)}</TableCell>
                    <TableCell className="text-right">{formatEuro(r.hkFees)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatEuro(computation.grossRevenue)}</TableCell>
                  <TableCell className="text-right">{formatEuro(computation.hkFees)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Formulaires ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Détail des formulaires</CardTitle>
          <CardDescription>Prévisualisez chaque formulaire avant export.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {computation.forms.map((form) => (
              <AccordionItem key={form.id} value={form.id}>
                <AccordionTrigger className="text-left">{form.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {form.sections.map((section) => (
                      <div key={section.title}>
                        <p className="mb-2 text-sm font-semibold text-muted-foreground">{section.title}</p>
                        <Table>
                          <TableBody>
                            {section.lines.map((line) => (
                              <TableRow key={`${form.id}-${line.code}`}>
                                <TableCell className="w-16 text-xs text-muted-foreground">{line.code}</TableCell>
                                <TableCell>
                                  {line.label}
                                  {line.note && (
                                    <p className="text-xs text-muted-foreground">{line.note}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium whitespace-nowrap">
                                  {line.amount !== 0 || !line.note ? formatEuro(line.amount) : ""}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Ce module est une aide à la préparation de votre déclaration : il ne remplace pas la télétransmission
        officielle (EDI-TDFC) ni la validation par un expert-comptable.
      </p>
    </div>
  );
};

export default LmnpLiasseTab;
