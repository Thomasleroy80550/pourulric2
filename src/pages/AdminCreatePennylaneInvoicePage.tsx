"use client"

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Loader2, Send } from 'lucide-react';

import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { getAllProfiles } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { createPennylaneInvoice, PennylaneInvoicePayload } from '@/lib/pennylane-api';

const vatRates = [
  { label: "20%", value: "FR_1_20" },
  { label: "10%", value: "FR_1_10" },
  { label: "5.5%", value: "FR_1_05" },
  { label: "0%", value: "FR_1_00" },
];

const invoiceLineSchema = z.object({
  label: z.string().min(1, "La description est requise."),
  quantity: z.coerce.number().min(0.01, "La quantité doit être supérieure à 0."),
  unit_amount: z.coerce.number().min(0, "Le prix unitaire est requis."),
  vat_rate: z.string().min(1, "Le taux de TVA est requis."),
});

const invoiceSchema = z.object({
  customer_id: z.coerce.number().min(1, "Veuillez sélectionner un client valide."),
  label: z.string().min(1, "Le titre de la facture est requis."),
  date: z.date({ required_error: "La date de la facture est requise." }),
  draft: z.boolean().default(true),
  invoice_lines: z.array(invoiceLineSchema).min(1, "La facture doit contenir au moins une ligne."),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const AdminCreatePennylaneInvoicePage: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      draft: true,
      invoice_lines: [{ label: '', quantity: 1, unit_amount: 0, vat_rate: 'FR_1_20' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invoice_lines",
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const allProfiles = await getAllProfiles();
        const pennylaneProfiles = allProfiles.filter(p => p.pennylane_customer_id);
        setProfiles(pennylaneProfiles);
      } catch (err) {
        toast.error("Erreur lors de la récupération des clients.");
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  const onSubmit = async (values: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: PennylaneInvoicePayload = {
        customer_id: values.customer_id,
        label: values.label,
        date: values.date.toISOString().split('T')[0], // Format YYYY-MM-DD
        draft: values.draft,
        currency: 'EUR',
        language: 'fr_FR',
        invoice_lines: values.invoice_lines.map(line => ({
          ...line,
          unit: 'piece', // Default unit
        })),
      };

      const result = await createPennylaneInvoice(payload);
      toast.success(`Facture ${result.invoice_number} créée avec succès !`, {
        description: `La facture est maintenant disponible dans Pennylane.`,
        action: {
          label: 'Voir la facture',
          onClick: () => window.open(result.public_file_url, '_blank'),
        },
      });
      form.reset();
    } catch (err: any) {
      toast.error("Erreur lors de la création de la facture", {
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Créer une Facture Pennylane</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Informations Générales</CardTitle>
                <CardDescription>Détails principaux de la facture.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingProfiles}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingProfiles ? "Chargement..." : "Sélectionner un client Pennylane"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.pennylane_customer_id!.toString()}>
                              {p.first_name} {p.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de la facture</FormLabel>
                      <FormControl><Input placeholder="Ex: Facture de services Juillet 2024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de la facture</FormLabel>
                      <DatePicker value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="draft"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Créer en tant que brouillon</FormLabel>
                        <CardDescription>Si activé, la facture ne sera pas finalisée dans Pennylane.</CardDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lignes de la Facture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                    <FormField
                      control={form.control}
                      name={`invoice_lines.${index}.label`}
                      render={({ field }) => (
                        <FormItem className="col-span-12 md:col-span-5">
                          <FormLabel>Description</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`invoice_lines.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="col-span-4 md:col-span-2">
                          <FormLabel>Quantité</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`invoice_lines.${index}.unit_amount`}
                      render={({ field }) => (
                        <FormItem className="col-span-4 md:col-span-2">
                          <FormLabel>Prix Unitaire (€)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`invoice_lines.${index}.vat_rate`}
                      render={({ field }) => (
                        <FormItem className="col-span-4 md:col-span-2">
                          <FormLabel>TVA</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {vatRates.map(rate => <SelectItem key={rate.value} value={rate.value}>{rate.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="col-span-12 md:col-span-1 flex items-end h-full">
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ label: '', quantity: 1, unit_amount: 0, vat_rate: 'FR_1_20' })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une ligne
                </Button>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Créer la facture sur Pennylane
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatePennylaneInvoicePage;