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

export type ServiceProviderInsert = Omit<ServiceProvider, 'id' | 'created_at'>;
export type ServiceProviderUpdate = Partial<ServiceProviderInsert>;

export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching service providers:', error);
    throw new Error(error.message);
  }

  return data || [];
};

export const addServiceProvider = async (provider: ServiceProviderInsert): Promise<ServiceProvider> => {
  const { data, error } = await supabase
    .from('service_providers')
    .insert(provider)
    .select()
    .single();

  if (error) {
    console.error('Error adding service provider:', error);
    throw new Error(error.message);
  }

  return data;
};

export const updateServiceProvider = async (id: string, updates: ServiceProviderUpdate): Promise<ServiceProvider> => {
  const { data, error } = await supabase
    .from('service_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service provider:', error);
    throw new Error(error.message);
  }

  return data;
};

export const deleteServiceProvider = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('service_providers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting service provider:', error);
    throw new Error(error.message);
  }
};