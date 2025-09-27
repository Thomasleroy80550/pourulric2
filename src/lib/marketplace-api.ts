import { supabase } from '@/integrations/supabase/client';

export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  image_url?: string;
  is_approved: boolean;
  created_at: string;
}

export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching service providers:', error);
    throw new Error(error.message);
  }

  return data || [];
};