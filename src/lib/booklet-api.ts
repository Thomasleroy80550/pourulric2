import { supabase } from '@/integrations/supabase/client';
import { TBookletSchema } from '@/components/DigitalBookletForm';

export const getBooklet = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('digital_booklets')
    .select('content')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error;
  }

  return data?.content as TBookletSchema | null;
};

export const saveBooklet = async (content: TBookletSchema) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('digital_booklets')
    .upsert({ user_id: user.id, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};