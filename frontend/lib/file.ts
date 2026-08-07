// Read a File into a base64 data URL (e.g. "data:application/pdf;base64,...").
// Used for small binary uploads stored inline in the database, like the résumé.
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}
