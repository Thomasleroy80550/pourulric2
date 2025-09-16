import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface Document {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  category: string | null;
  created_at: string;
}

export type AdminDocument = Pick<Document, 'id' | 'name' | 'category' | 'file_path'>;

// Pour les utilisateurs
export const getDocuments = async (): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Impossible de récupérer les documents.');
  }

  return data || [];
};

export const downloadDocument = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('secure_documents')
    .download(filePath);

  if (error) {
    console.error('Error downloading document:', error);
    throw new Error('Impossible de télécharger le document.');
  }

  return { data, error: null };
};

// Pour les administrateurs
export const getDocumentsForUser = async (userId: string): Promise<AdminDocument[]> => {
    const { data, error } = await supabase
        .from('documents')
        .select('id, name, category, file_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error("Impossible de récupérer les documents de l'utilisateur.");
    }
    return data;
};

interface DocumentMetadata {
    name: string;
    description?: string;
    category?: string;
}

export const uploadDocument = async (userId: string, file: File, metadata: DocumentMetadata) => {
    const fileExtension = file.name.split('.').pop();
    const filePath = `${userId}/${uuidv4()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
        .from('secure_documents')
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(`Erreur de téléversement du fichier: ${uploadError.message}`);
    }

    const { error: dbError } = await supabase
        .from('documents')
        .insert({
            user_id: userId,
            name: metadata.name,
            description: metadata.description,
            category: metadata.category,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
        });

    if (dbError) {
        await supabase.storage.from('secure_documents').remove([filePath]);
        throw new Error(`Erreur d'enregistrement en base de données: ${dbError.message}`);
    }
};

export const deleteDocument = async (docId: string, filePath: string) => {
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

    if (dbError) {
        throw new Error(`Erreur de suppression en base de données: ${dbError.message}`);
    }

    const { error: storageError } = await supabase.storage
        .from('secure_documents')
        .remove([filePath]);
    
    if (storageError) {
        console.error(`Failed to delete file from storage, but DB record was deleted: ${storageError.message}`);
    }
};

/**
 * Creates a new document record in the database.
 * @param doc The document data to insert.
 * @returns The created document data.
 */
export async function createDocument(doc: {
  user_id: string;
  name: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
}): Promise<any> {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();

  if (error) {
    console.error('Error creating document:', error);
    throw new Error(`Erreur lors de la création du document : ${error.message}`);
  }

  return data;
}