import { supabase } from '@/integrations/supabase/client';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const getFaqsForAdmin = async (): Promise<Faq[]> => {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching FAQs for admin:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const getPublishedFaqs = async (): Promise<Faq[]> => {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching published FAQs:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createFaq = async (faq: Pick<Faq, 'question' | 'answer'>): Promise<Faq> => {
  const { data, error } = await supabase
    .from('faqs')
    .insert({ ...faq, is_published: true }) // Ajout de is_published: true par défaut
    .select()
    .single();

  if (error) {
    console.error('Error creating FAQ:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateFaq = async (id: string, updates: Partial<Pick<Faq, 'question' | 'answer' | 'is_published'>>): Promise<Faq> => {
  const { data, error } = await supabase
    .from('faqs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating FAQ:', error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteFaq = async (id: string): Promise<void> => {
  const { error } = await supabase.from('faqs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting FAQ:', error);
    throw new Error(error.message);
  }
};