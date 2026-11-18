export async function validateBrandingLogo(file: File): Promise<void> {
  if (!['image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Velg en PNG- eller WebP-logo.');
  }
  if (file.size === 0 || file.size > 1024 * 1024) {
    throw new Error('Logoen kan være maks 1 MiB.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Kunne ikke åpne logoen. Velg en gyldig PNG- eller WebP-fil.');
  }
  const validDimensions = bitmap.width <= 2048 && bitmap.height <= 2048;
  bitmap.close();
  if (!validDimensions) throw new Error('Logoen kan være maks 2048 × 2048 piksler.');
}
