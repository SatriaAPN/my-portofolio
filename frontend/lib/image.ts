// Client-side image resize → JPEG dataURL (mirrors the handoff: ≤1000px, q .85).
// Keeps uploads small enough to store inline in the database.
export function resizeImageToDataURL(file: File, max = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas context"));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => reject(new Error("could not load image"));
    img.src = URL.createObjectURL(file);
  });
}
