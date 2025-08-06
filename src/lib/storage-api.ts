import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to a specified Supabase Storage bucket.
 * @param bucketName The name of the bucket.
 * @param filePath The path and name of the file in the bucket.
 * @param file The file object to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(bucketName: string, filePath: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Overwrite if file already exists
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Erreur lors du téléversement du fichier : ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  return publicUrl;
}

/**
 * Uploads a statement PDF to the 'statements' bucket.
 * @param userId The ID of the user.
 * @param invoiceId The ID of the invoice.
 * @param pdfFile The PDF file to upload.
 * @returns An object containing the path of the uploaded file.
 */
export async function uploadStatementPdf(userId: string, invoiceId: string, pdfFile: File): Promise<{ path: string }> {
  const filePath = `${userId}/${invoiceId}.pdf`;

  const { error, data } = await supabase.storage
    .from('statements')
    .upload(filePath, pdfFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading statement PDF:', error);
    throw new Error(`Erreur lors du téléversement du PDF : ${error.message}`);
  }

  return { path: data.path };
}