/**
 * Reduz a foto da câmera (que pode ter 4–12 MB) para no máximo `maxSize` px
 * no maior lado, em JPEG. Acelera bastante o upload em redes móveis.
 * Se o navegador não conseguir decodificar o arquivo (ex.: HEIC no Chrome),
 * o arquivo original é devolvido sem alterações.
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.82,
): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;

  try {
    // imageOrientation "from-image" respeita a rotação EXIF da câmera.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    // Só usa a versão comprimida se de fato ficou menor.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
