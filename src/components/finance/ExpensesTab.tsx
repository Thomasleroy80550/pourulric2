import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle, Trash2, Calendar, Repeat, Clock } from 'lucide-react';
import { getExpenses, addExpense, deleteExpense, Expense, getRecurringExpenses, addRecurringExpense, deleteRecurringExpense, RecurringExpense, generateRecurringInstances } from '@/lib/expenses-api';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from '@/hooks/use-mobile';

const singleExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0."),
  description: z.string().min(3, "La description est trop courte."),
  category: z.string().optional(),
  expense_date: z.string().min(1, "La date est requise."),
});

const recurringExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0."),
  description: z.string().min(3, "La description est trop courte."),
  category: z.string().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  start_date: z.string().min(1, "La date de début est requise."),
  end_date: z.string().optional(),
});

const ExpensesTab: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const isMobile = useIsMobile();

  const singleForm = useForm<z.infer<typeof singleExpenseSchema>>({
    resolver: zodResolver(singleExpenseSchema),
    defaultValues: { amount: undefined, description: '', category: '', expense_date: new Date().toISOString().split('T')[0] },
  });

  const recurringForm = useForm<z.infer<typeof recurringExpenseSchema>>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: { amount: undefined, description: '', category: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '' },
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [singleData, recurringData] = await Promise.all([
        getExpenses(currentYear),
        getRecurringExpenses(),
      ]);
      const recurringInstances = generateRecurringInstances(recurringData, currentYear);
      const combinedExpenses = [...singleData, ...recurringInstances].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
      
      setAllExpenses(combinedExpenses);
      setRecurringTemplates(recurringData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentYear]);

  const onSingleSubmit = async (values: z.infer<typeof singleExpenseSchema>) => {
    try {
      await addExpense(values);
      toast.success("Dépense ajoutée !");
      singleForm.reset();
      fetchData();
    } catch (err: any) { toast.error(`Erreur: ${err.message}`); }
  };

  const onRecurringSubmit = async (values: z.infer<typeof recurringExpenseSchema>) => {
    try {
      await addRecurringExpense({ ...values, end_date: values.end_date || undefined });
      toast.success("Dépense récurrente ajoutée !");
      recurringForm.reset();
      fetchData();
    } catch (err: any) { toast.error(`Erreur: ${err.message}`); }
  };

  const handleDeleteSingle = async (id: string) => {
    if (id.startsWith('recurring-')) {
      toast.error("Vous ne pouvez pas supprimer une dépense récurrente individuelle ici. Veuillez gérer le modèle dans l'onglet 'Dépenses Récurrentes'.");
      return;
    }
    if (!window.confirm("Supprimer cette dépense ?")) return;
    try { await deleteExpense(id); toast.success("Dépense supprimée."); fetchData(); }
    catch (err: any) { toast.error(`Erreur: ${err.message}`); }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!window.confirm("Supprimer cette dépense récurrente ?")) return;
    try { await deleteRecurringExpense(id); toast.success("Dépense récurrente supprimée."); fetchData(); }
    catch (err: any) { toast.error(`Erreur: ${err.message}`); }
  };

  const renderSingleExpenses = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (allExpenses.length === 0) return <p className="text-center text-gray-500 py-8">Aucune dépense.</p>;

    if (isMobile) {
      return (
        <div className="space-y-4">
          {allExpenses.map(e => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{e.description}</p>
                    <p className="text-sm text-muted-foreground flex items-center"><Calendar className="h-3 w-3 mr-1.5" />{format(parseISO(e.expense_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <p className="font-medium text-red-600 text-lg">{e.amount.toFixed(2)}€</p>
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSingle(e.id)} disabled={e.id.startsWith('recurring-')}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>{allExpenses.map(e => (<TableRow key={e.id}><TableCell>{format(parseISO(e.expense_date), 'dd/MM/yyyy')}</TableCell><TableCell>{e.description}</TableCell><TableCell className="text-right font-medium text-red-600">{e.amount.toFixed(2)}€</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteSingle(e.id)} disabled={e.id.startsWith('recurring-')}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
      </Table>
    );
  };

  const renderRecurringExpenses = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (recurringTemplates.length === 0) return <p className="text-center text-gray-500 py-8">Aucune dépense récurrente.</p>;

    if (isMobile) {
      return (
        <div className="space-y-4">
          {recurringTemplates.map(e => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{e.description}</p>
                    <p className="text-sm text-muted-foreground flex items-center"><Repeat className="h-3 w-3 mr-1.5" />{e.frequency}</p>
                    <p className="text-sm text-muted-foreground flex items-center"><Clock className="h-3 w-3 mr-1.5" />Début: {format(parseISO(e.start_date), 'dd/MM/yy')}</p>
                  </div>
                  <p className="font-medium text-red-600 text-lg">{e.amount.toFixed(2)}€</p>
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRecurring(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Montant</TableHead><TableHead>Fréquence</TableHead><TableHead>Début</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>{recurringTemplates.map(e => (<TableRow key={e.id}><TableCell>{e.description}</TableCell><TableCell className="font-medium text-red-600">{e.amount.toFixed(2)}€</TableCell><TableCell>{e.frequency}</TableCell><TableCell>{format(parseISO(e.start_date), 'dd/MM/yy')}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteRecurring(e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
      </Table>
    );
  };

  return (
    <div className="mt-6">
      <Tabs defaultValue="single">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Dépenses Ponctuelles</TabsTrigger>
          <TabsTrigger value="recurring">Dépenses Récurrentes</TabsTrigger>
        </TabsList>
        <TabsContent value="single">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-1">
              <Card><CardHeader><CardTitle>Ajouter une Dépense Ponctuelle</CardTitle></CardHeader>
                <CardContent>
                  <Form {...singleForm}>
                    <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
                      <FormField control={singleForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Montant (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={singleForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={singleForm.control} name="category" render={({ field }) => (<FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={singleForm.control} name="expense_date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <Button type="submit" disabled={singleForm.formState.isSubmitting}><PlusCircle className="h-4 w-4 mr-2" />Ajouter</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card><CardHeader><CardTitle>Historique ({currentYear})</CardTitle></CardHeader>
                <CardContent>
                  {renderSingleExpenses()}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="recurring">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-1">
              <Card><CardHeader><CardTitle>Ajouter une Dépense Récurrente</CardTitle></CardHeader>
                <CardContent>
                  <Form {...recurringForm}>
                    <form onSubmit={recurringForm.handleSubmit(onRecurringSubmit)} className="space-y-4">
                      <FormField control={recurringForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Montant (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Fréquence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensuelle</SelectItem><SelectItem value="quarterly">Trimestrielle</SelectItem><SelectItem value="yearly">Annuelle</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={recurringForm.control} name="end_date" render={({ field }) => (<FormItem><FormLabel>Date de fin (Optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <Button type="submit" disabled={recurringForm.formState.isSubmitting}><PlusCircle className="h-4 w-4 mr-2" />Ajouter</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card><CardHeader><CardTitle>Vos Dépenses Récurrentes</CardTitle></CardHeader>
                <CardContent>
                  {renderRecurringExpenses()}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpensesTab;