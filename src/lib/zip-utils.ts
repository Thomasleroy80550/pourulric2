import JSZip from "jszip";

export async function createZipBlob(files: Array<{ path: string; data: Blob }>): Promise<Blob> {
  const zip = new JSZip();

  for (const f of files) {
    // JSZip can take Blob directly
    zip.file(f.path, f.data);
  }

  return zip.generateAsync({ type: "blob" });
}
