import { ImageMagick, initializeImageMagick, MagickFormat, ResourceLimits } from '@imagemagick/magick-wasm';

await initializeImageMagick(await Deno.readFile(new URL('x86/magick.wasm', import.meta.resolve('@imagemagick/magick-wasm'))));
ResourceLimits.width = 2048n;
ResourceLimits.height = 2048n;
ResourceLimits.memory = 64n * 1024n * 1024n;
ResourceLimits.maxMemoryRequest = 64n * 1024n * 1024n;
ResourceLimits.disk = 0n;
ResourceLimits.listLength = 8n;

const maxUploadSize = 1024 * 1024;

export function normalizeLogo(bytes: Uint8Array, mimeType: string): Uint8Array {
  if (!bytes.length || bytes.length > maxUploadSize) {
    throw new Error('Logoen kan være maks 1 MiB.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  const png = text(0, 8) === '\x89PNG\r\n\x1a\n';
  const webp = text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP';
  if (!(png && mimeType === 'image/png') && !(webp && mimeType === 'image/webp')) {
    throw new Error('Velg en gyldig PNG- eller WebP-logo.');
  }

  // Check container boundaries and reject animation before the decoder allocates pixels.
  let offset = png ? 8 : 12;
  if (webp && view.getUint32(4, true) + 8 !== bytes.length) throw new Error('WebP-filen er skadet.');
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error('Logofilen er skadet.');
    const kind = png ? text(offset + 4, offset + 8) : text(offset, offset + 4);
    const length = png ? view.getUint32(offset) : view.getUint32(offset + 4, true);
    if (['acTL', 'ANIM', 'ANMF'].includes(kind)) throw new Error('Velg en logo uten animasjon.');
    offset += length + (png ? 12 : 8 + (length % 2));
    if (offset > bytes.length) throw new Error('Logofilen er skadet.');
  }

  try {
    return ImageMagick.read(bytes, png ? MagickFormat.Png : MagickFormat.WebP, (image) => {
      if (!image.width || !image.height || image.width > 2048 || image.height > 2048) {
        throw new Error('Invalid image dimensions');
      }
      image.strip();
      return image.write(MagickFormat.Png, (output) => {
        if (output.length > 262144) throw new Error('Normalized logo is too large');
        return new Uint8Array(output);
      });
    });
  } catch (cause) {
    throw new Error('Logoen må være et gyldig bilde på maks 2048 × 2048 piksler og 256 KiB etter behandling.', { cause });
  }
}
