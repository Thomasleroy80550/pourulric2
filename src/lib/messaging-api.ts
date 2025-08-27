import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
}

// For the user
export const getMyConversations = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles (
        first_name,
        last_name,
        email
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
};

// For the admin
export const getAllConversations = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles (
        first_name,
        last_name,
        email
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
};

export const getConversationById = async (id: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles (
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Conversation;
};

export const getMessagesForConversation = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles (
        first_name,
        last_name,
        role
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
};

export const createConversation = async (subject: string, content: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({ subject, user_id: user.id })
    .select()
    .single();

  if (convError) throw convError;

  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
    });

  if (msgError) throw msgError;

  return conversation as Conversation;
};

export const sendMessage = async (conversationId: string, content: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};