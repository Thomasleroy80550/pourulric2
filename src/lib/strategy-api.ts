import { supabase } from '@/integrations/supabase/client';

export interface Strategy {
  id: string;
  user_id: string;
  created_by: string;
  strategy_content: string;
  status: 'active' | 'review_requested';
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