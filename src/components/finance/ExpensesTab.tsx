import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Terminal,
  PlusCircle,
  Trash2,
  Calendar,
  Repeat,
  Clock,
  Wallet,
  ReceiptText,
  TrendingDown,
  PieChart as PieChartIcon,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  getExpenses,
  addExpense,
  deleteExpense,
  Expense,
  getRecurringExpenses,
  addRecurringExpense,
  deleteRecurringExpense,
  RecurringExpense,
  generateRecurringInstances,
} from '@/lib/expenses-api';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

// Catégories prédéfinies pour des statistiques fiables et cohérentes.
const EXPENSE_CATEGORIES = [
  { value: 'Crédit / Prêt immobilier', color: '#4f46e5' },
  { value: 'Charges de copropriété', color: '#0ea5e9' },
  { value: 'Taxe foncière', color: '#f59e0b' },
  { value: 'Assurance (PNO / habitation)', color: '#14b8a6' },
  { value: 'Énergie (élec, gaz, eau)', color: '#ef4444' },
  { value: 'Internet / Box', color: '#8b5cf6' },
  { value: 'Ménage / Blanchisserie', color: '#ec4899' },
  { value: 'Entretien / Réparations', color: '#f97316' },
  { value: 'Mobilier / Équipement', color: '#22c55e' },
  { value: 'Honoraires de gestion', color: '#6366f1' },
  { value: 'Abonnements', color: '#06b6d4' },
  { value: 'Autre', color: '#6b7280' },
];

const UNCATEGORIZED = 'Non catégorisé';

const getCategoryColor = (category?: string) =>
  EXPENSE_CATEGORIES.find((c) => c.value === category)?.color ?? '#94a3b8';

const formatEuro = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

const singleExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0.'),
  description: z.string().min(3, 'La description est trop courte.'),
  category: z.string().optional(),
  expense_date: z.string().min(1, 'La date est requise.'),
});

const recurringExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0.'),
  description: z.string().min(3, 'La description est trop courte.'),
  category: z.string().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  start_date: z.string().min(1, 'La date de début est requise.'),
  end_date: z.string().optional(),
});

const FREQUENCY_LABELS: Record<RecurringExpense['frequency'], string> = {
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  yearly: 'Annuelle',
};

const ExpensesTab: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const isMobile = useIsMobile();

  const yearOptions = useMemo(
    () => Array.from({ length: 3 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const singleForm = useForm<z.infer<typeof singleExpenseSchema>>({
    resolver: zodResolver(singleExpenseSchema),
    defaultValues: { amount: undefined, description: '', category: '', expense_date: new Date().toISOString().split('T')[0] },
  });

  const recurringForm = useForm<z.infer<typeof recurringExpenseSchema>>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: { amount: undefined, description: '', category: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '' },
  });

  const fetchData = async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const [singleData, recurringData] = await Promise.all([
        getExpenses(year),
        getRecurringExpenses(),
      ]);
      const recurringInstances = generateRecurringInstances(recurringData, year);
      const combinedExpenses = [...singleData, ...recurringInstances].sort(
        (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime(),
      );

      setAllExpenses(combinedExpenses);
      setRecurringTemplates(recurringData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear]);

  // --- Statistiques dérivées ---
  const stats = useMemo(() => {
    const total = allExpenses.reduce((acc, e) => acc + e.amount, 0);
    const recurringInstances = allExpenses.filter((e) => e.id.startsWith('recurring-'));
    const recurringTotal = recurringInstances.reduce((acc, e) => acc + e.amount, 0);
    const monthsElapsed = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
    const monthlyAverage = total / monthsElapsed;

    const byCategory = new Map<string, number>();
    allExpenses.forEach((e) => {
      const key = e.category && e.category.trim() ? e.category : UNCATEGORIZED;
      byCategory.set(key, (byCategory.get(key) || 0) + e.amount);
    });
    const categories = Array.from(byCategory.entries())
      .map(([name, amount]) => ({ name, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return { total, recurringTotal, monthlyAverage, count: allExpenses.length, categories };
  }, [allExpenses, selectedYear, currentYear]);

  const onSingleSubmit = async (values: z.infer<typeof singleExpenseSchema>) => {
    try {
      await addExpense(values as Parameters<typeof addExpense>[0]);
      toast.success('Dépense ajoutée !');
      singleForm.reset({ amount: undefined, description: '', category: '', expense_date: new Date().toISOString().split('T')[0] });
      fetchData(selectedYear);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const onRecurringSubmit = async (values: z.infer<typeof recurringExpenseSchema>) => {
    try {
      await addRecurringExpense({ ...values, end_date: values.end_date || undefined } as Parameters<typeof addRecurringExpense>[0]);
      toast.success('Dépense récurrente ajoutée !');
      recurringForm.reset({ amount: undefined, description: '', category: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '' });
      fetchData(selectedYear);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (id.startsWith('recurring-')) {
      toast.error("Vous ne pouvez pas supprimer une occurrence récurrente ici. Gérez le modèle dans l'onglet « Charges récurrentes ».");
      return;
    }
    if (!window.confirm('Supprimer cette dépense ?')) return;
    try {
      await deleteExpense(id);
      toast.success('Dépense supprimée.');
      fetchData(selectedYear);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!window.confirm('Supprimer cette dépense récurrente ?')) return;
    try {
      await deleteRecurringExpense(id);
      toast.success('Dépense récurrente supprimée.');
      fetchData(selectedYear);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const CategoryTag = ({ category }: { category?: string }) => {
    const label = category && category.trim() ? category : UNCATEGORIZED;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
        <span className="truncate">{label}</span>
      </span>
    );
  };

  const renderSingleExpenses = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (allExpenses.length === 0)
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <ReceiptText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 font-medium">Aucune charge enregistrée pour {selectedYear}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Ajoutez vos charges pour obtenir un bénéfice net réaliste dans vos statistiques.
          </p>
        </div>
      );

    if (isMobile) {
      return (
        <div className="space-y-3">
          {allExpenses.map((e) => (
            <Card key={e.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.description}</p>
                    <p className="mt-0.5 flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-1.5 h-3 w-3" />
                      {format(parseISO(e.expense_date), 'dd/MM/yyyy')}
                    </p>
                    <div className="mt-1"><CategoryTag category={e.category} /></div>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-red-600">{e.amount.toFixed(2)}€</p>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSingle(e.id)} disabled={e.id.startsWith('recurring-')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allExpenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{format(parseISO(e.expense_date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{e.description}</TableCell>
              <TableCell><CategoryTag category={e.category} /></TableCell>
              <TableCell className="text-right font-medium text-red-600">{e.amount.toFixed(2)}€</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSingle(e.id)} disabled={e.id.startsWith('recurring-')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderRecurringExpenses = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (recurringTemplates.length === 0)
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <Repeat className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 font-medium">Aucune charge récurrente</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Crédit, assurance, copropriété… Enregistrez-les une fois, elles seront comptées automatiquement chaque année.
          </p>
        </div>
      );

    if (isMobile) {
      return (
        <div className="space-y-3">
          {recurringTemplates.map((e) => (
            <Card key={e.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.description}</p>
                    <p className="mt-0.5 flex items-center text-sm text-muted-foreground">
                      <Repeat className="mr-1.5 h-3 w-3" />
                      {FREQUENCY_LABELS[e.frequency]}
                    </p>
                    <p className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1.5 h-3 w-3" />
                      Début : {format(parseISO(e.start_date), 'dd/MM/yy')}
                    </p>
                    <div className="mt-1"><CategoryTag category={e.category} /></div>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-red-600">{e.amount.toFixed(2)}€</p>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRecurring(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Fréquence</TableHead>
            <TableHead>Début</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recurringTemplates.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.description}</TableCell>
              <TableCell><CategoryTag category={e.category} /></TableCell>
              <TableCell className="font-medium text-red-600">{e.amount.toFixed(2)}€</TableCell>
              <TableCell>{FREQUENCY_LABELS[e.frequency]}</TableCell>
              <TableCell>{format(parseISO(e.start_date), 'dd/MM/yy')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecurring(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const summaryTiles = [
    { label: 'Total des charges', value: formatEuro(stats.total), icon: TrendingDown, hint: `Année ${selectedYear}` },
    { label: 'Moyenne / mois', value: formatEuro(stats.monthlyAverage), icon: Calendar, hint: 'Sur la période' },
    { label: 'Charges récurrentes', value: formatEuro(stats.recurringTotal), icon: Repeat, hint: 'Automatiques / an' },
    { label: 'Nombre de charges', value: String(stats.count), icon: ReceiptText, hint: 'Enregistrées' },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* ── Bandeau incitatif ───────────────────────────── */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-widest">Vos vraies statistiques</span>
            </div>
            <h3 className="mt-2 text-lg font-bold sm:text-xl">Ajoutez vos charges, obtenez votre rentabilité réelle</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85">
              Crédit, taxe foncière, assurance, énergie… Chaque charge saisie est automatiquement déduite de votre
              <span className="font-semibold"> bénéfice net</span> dans la page Performances. Plus vous en ajoutez, plus vos stats sont justes.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25">
            <Link to="/performance">
              Voir mes performances
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── En-tête + sélecteur d'année ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          Synthèse de vos charges
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Année</span>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
            <SelectTrigger className="h-9 w-[130px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y === currentYear ? `${y} (en cours)` : y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Cartes de synthèse ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          : summaryTiles.map((tile) => (
              <div key={tile.label} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="rounded-lg bg-muted p-1.5 text-[hsl(var(--sidebar-foreground))] w-fit">
                  <tile.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 truncate text-xl font-bold sm:text-2xl">{tile.value}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{tile.label}</p>
                <p className="truncate text-[10px] text-muted-foreground">{tile.hint}</p>
              </div>
            ))}
      </div>

      {/* ── Répartition par catégorie ───────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PieChartIcon className="h-4 w-4 text-[hsl(var(--sidebar-foreground))]" />
            Répartition par catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : stats.categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée à afficher.</p>
          ) : (
            <div className="space-y-3">
              {stats.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(cat.name) }} />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{formatEuro(cat.amount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: getCategoryColor(cat.name) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Gestion : ponctuelles / récurrentes ─────────── */}
      <Tabs defaultValue="single">
        <TabsList className="grid w-full grid-cols-2 rounded-full sm:max-w-md">
          <TabsTrigger value="single" className="rounded-full">Charges ponctuelles</TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-full">Charges récurrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base">Ajouter une charge ponctuelle</CardTitle></CardHeader>
                <CardContent>
                  <Form {...singleForm}>
                    <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
                      <FormField control={singleForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Montant (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={singleForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Ex : Facture EDF novembre" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={singleForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                    {c.value}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={singleForm.control} name="expense_date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <Button type="submit" className="w-full" disabled={singleForm.formState.isSubmitting}><PlusCircle className="mr-2 h-4 w-4" />Ajouter la charge</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base">Historique {selectedYear}</CardTitle></CardHeader>
                <CardContent>{renderSingleExpenses()}</CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Ajouter une charge récurrente</CardTitle>
                  <Badge variant="secondary" className="mt-2 w-fit gap-1 font-normal">
                    <Repeat className="h-3 w-3" /> Comptée automatiquement
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Form {...recurringForm}>
                    <form onSubmit={recurringForm.handleSubmit(onRecurringSubmit)} className="space-y-4">
                      <FormField control={recurringForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Montant (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Ex : Mensualité crédit" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                    {c.value}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={recurringForm.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Fréquence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensuelle</SelectItem><SelectItem value="quarterly">Trimestrielle</SelectItem><SelectItem value="yearly">Annuelle</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="end_date" render={({ field }) => (<FormItem><FormLabel>Date de fin (optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <Button type="submit" className="w-full" disabled={recurringForm.formState.isSubmitting}><PlusCircle className="mr-2 h-4 w-4" />Ajouter la charge</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base">Vos charges récurrentes</CardTitle></CardHeader>
                <CardContent>{renderRecurringExpenses()}</CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpensesTab;
