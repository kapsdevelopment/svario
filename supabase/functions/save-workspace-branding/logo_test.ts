import { normalizeLogo } from './logo.ts';

const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'), (c) => c.charCodeAt(0));
const webp = Uint8Array.from(atob('UklGRjgAAABXRUJQVlA4ICwAAACwAgCdASoYAAwAPm0qkUWkIqGYBABABsSxgABCBgAA/vDo1/+6Hvq8qcyAAA=='), (c) => c.charCodeAt(0));

function assertThrows(action: () => unknown) {
  try { action(); } catch { return; }
  throw new Error('Expected logo validation to fail');
}

Deno.test('PNG and WebP are decoded and rewritten as a PNG', () => {
  for (const [bytes, mime] of [[png, 'image/png'], [webp, 'image/webp']] as const) {
    const result = normalizeLogo(bytes, mime);
    if (String.fromCharCode(...result.subarray(1, 4)) !== 'PNG') throw new Error('Expected a PNG');
    const view = new DataView(result.buffer);
    if (view.getUint32(16) !== 24 || view.getUint32(20) !== 12) throw new Error('Dimensions changed');
  }
});

Deno.test('SVG, mismatched MIME, truncated images and oversized uploads are rejected', () => {
  assertThrows(() => normalizeLogo(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/png'));
  assertThrows(() => normalizeLogo(png, 'image/webp'));
  assertThrows(() => normalizeLogo(png.subarray(0, 40), 'image/png'));
  assertThrows(() => normalizeLogo(new Uint8Array(1024 * 1024 + 1), 'image/png'));
});

Deno.test('Large declared dimensions and animated WebP containers are rejected', () => {
  const huge = png.slice();
  new DataView(huge.buffer).setUint32(16, 30000);
  assertThrows(() => normalizeLogo(huge, 'image/png'));
  const animation = new Uint8Array(20);
  animation.set(new TextEncoder().encode('RIFF'), 0);
  animation.set(new TextEncoder().encode('WEBPANIM'), 8);
  new DataView(animation.buffer).setUint32(4, 12, true);
  assertThrows(() => normalizeLogo(animation, 'image/webp'));
});
