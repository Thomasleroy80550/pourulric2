import { supabase } from '../integrations/supabase/client';

/**
 * Télécharge une liste de fichiers vers un bucket Supabase Storage.
 * @param files La liste des fichiers à télécharger (FileList).
 * @param bucketName Le nom du bucket Supabase Storage.
 * @param folderPath Le chemin du dossier à l'intérieur du bucket (ex: 'report_updates/report_id').
 * @returns Une promesse qui résout en un tableau d'URLs publiques des fichiers téléchargés.
 */
export async function uploadFiles(files: FileList, bucketName: string, folderPath: string): Promise<string[]> {
  const uploadedUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Créer un chemin de fichier unique pour éviter les collisions
    const filePath = `${folderPath}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file);

    if (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      throw new Error(`Échec du téléchargement du fichier ${file.name}: ${error.message}`);
    }

    // Récupérer l'URL publique du fichier téléchargé
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    if (publicUrlData) {
      uploadedUrls.push(publicUrlData.publicUrl);
    }
  }
  return uploadedUrls;
}