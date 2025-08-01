import { supabase } from '@/integrations/supabase/client';

export interface Strategy {
  id: string;
  user_id: string;
  created_by: string;
  strategy_content: string;
  status: 'active' | 'review_requested' | 'creation_requested';
  created_at: string;
  updated_at: string;
}

export const getMyStrategies = async (): Promise<Strategy[]> => {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching strategies:', error);
    throw new Error(error.message);
  }

  return data as Strategy[];
};

export const requestStrategyReview = async (strategyId: string): Promise<Strategy> => {
  const { data, error } = await supabase
    .from('strategies')
    .update({ status: 'review_requested' })
    .eq('id', strategyId)
    .select()
    .single();

  if (error) {
    console.error('Error requesting strategy review:', error);
    throw new Error(error.message);
  }

  return data as Strategy;
};

export const requestStrategyCreation = async (): Promise<Strategy> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié");

  // Check if a strategy already exists to prevent duplicates
  const { data: existing, error: existingError } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    throw new Error("Une stratégie ou une demande existe déjà pour cet utilisateur.");
  }
  // Ignore error code for "no rows found", which is expected
  if (existingError && existingError.code !== 'PGRST116') { 
    throw existingError;
  }

  const { data, error } = await supabase
    .from('strategies')
    .insert({ 
      user_id: user.id,
      created_by: user.id, // Placeholder, will be updated by admin
      strategy_content: 'L\'utilisateur a demandé la création d\'une stratégie.',
      status: 'creation_requested' 
    })
    .select()
    .single();

  if (error) {
    console.error('Error requesting strategy creation:', error);
    throw new Error(error.message);
  }

  return data as Strategy;
};