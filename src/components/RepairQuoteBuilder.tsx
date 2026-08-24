import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Calculator, FileDown } from 'lucide-react';
import { downloadRepairQuotePdf } from '@/lib/quote-pdf';

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface RepairQuoteBuilderProps {
  onInsert?: (quoteText: string) => void;
}

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const RepairQuoteBuilder: React.FC<RepairQuoteBuilderProps> = ({ onInsert }) => {
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [vatRate, setVatRate] = useState<number>(20);

  const addLine = () => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (id: string) => {
    setLines(prev => (prev.length > 1 ? prev.filter(l => l.id !== id) : prev));
  };

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const subtotal = lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const buildQuoteText = () => {
    const validLines = lines.filter(l => l.description.trim() !== '');
    const rows = validLines.map(
      l => `- ${l.description} — ${l.quantity} x ${formatEUR(l.unitPrice)} = ${formatEUR(l.quantity * l.unitPrice)}`
    );
    return [
      '--- DEVIS DE RÉPARATION ---',
      ...rows,
      '',
      `Sous-total HT : ${formatEUR(subtotal)}`,
      `TVA (${vatRate}%) : ${formatEUR(vatAmount)}`,
      `TOTAL TTC : ${formatEUR(total)}`,
      '---------------------------',
    ].join('\n');
  };

  const handleInsert = () => {
    if (onInsert) onInsert(buildQuoteText());
  };

  const handleDownload = () => {
    downloadRepairQuotePdf(lines, vatRate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Devis de réparation
        </CardTitle>
        <CardDescription>
          Estimez le coût de la réparation ligne par ligne, puis insérez le devis dans la description du rapport.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="flex-1 w-full">
                {index === 0 && <Label className="text-xs mb-1 block">Désignation</Label>}
                <Input
                  placeholder="Ex: Remplacement robinet cuisine"
                  value={line.description}
                  onChange={e => updateLine(line.id, { description: e.target.value })}
                />
              </div>
              <div className="w-full sm:w-20">
                {index === 0 && <Label className="text-xs mb-1 block">Qté</Label>}
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={line.quantity}
                  onChange={e => updateLine(line.id, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="w-full sm:w-32">
                {index === 0 && <Label className="text-xs mb-1 block">Prix unit. HT (€)</Label>}
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitPrice}
                  onChange={e => updateLine(line.id, { unitPrice: Number(e.target.value) })}
                />
              </div>
              <div className="w-full sm:w-28 text-sm font-medium sm:pb-2.5">
                {formatEUR((line.quantity || 0) * (line.unitPrice || 0))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.id)}
                disabled={lines.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une ligne
        </Button>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">TVA :</Label>
            <Select value={String(vatRate)} onValueChange={v => setVatRate(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 %</SelectItem>
                <SelectItem value="10">10 %</SelectItem>
                <SelectItem value="20">20 %</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm text-muted-foreground">Sous-total HT : {formatEUR(subtotal)}</p>
            <p className="text-sm text-muted-foreground">TVA ({vatRate}%) : {formatEUR(vatAmount)}</p>
            <p className="text-lg font-bold">Total TTC : {formatEUR(total)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleDownload}>
            <FileDown className="h-4 w-4 mr-2" />
            Télécharger le devis
          </Button>
          {onInsert && (
            <Button type="button" onClick={handleInsert}>
              Insérer dans la description
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RepairQuoteBuilder;
