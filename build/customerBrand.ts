import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const customerIconPath = 'brand/favicon.svg';
export const customerStylePath = 'brand/theme.css';
const staticSvgTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'title', 'desc']);

export function readCustomerBrand(directory: string) {
  const values = readFile(directory, 'brand.json');
  const data = readRecord(values, ['schemaVersion', 'name', 'description', 'tagline', 'accent', 'presentationOnly', 'identity']);
  if (data.schemaVersion !== 1) {
    throw new Error('Ukjent versjon av kundeprofilen (schemaVersion må være 1).');
  }
  const accent = readText(data.accent, 'accent', 7);
  if (!/^#[a-f\d]{6}$/i.test(accent) || whiteContrast(accent) < 4.5) {
    throw new Error('accent må være en #RRGGBB-farge med minst 4,5:1 kontrast mot hvitt.');
  }
  if (data.presentationOnly !== undefined && typeof data.presentationOnly !== 'boolean') {
    throw new Error('presentationOnly må være en boolsk verdi.');
  }
  const hasPngLogo = lstatSync(join(directory, 'logo.png'), { throwIfNoEntry: false }) !== undefined;
  if (hasPngLogo && lstatSync(join(directory, 'logo.svg'), { throwIfNoEntry: false })) {
    throw new Error('Velg enten logo.png eller logo.svg, ikke begge.');
  }
  const logoFileName = hasPngLogo ? 'logo.png' : 'logo.svg';
  const logo = hasPngLogo ? readPngLogo(directory) : readSvg(directory, logoFileName);
  const favicon = readSvg(directory, 'favicon.svg');
  const identity = data.identity === undefined ? null : readIdentity(data.identity);
  return {
    identity,
    name: readText(data.name, 'name', 80),
    description: readText(data.description, 'description', 180),
    tagline: readText(data.tagline, 'tagline', 80),
    accent,
    presentationOnly: data.presentationOnly === true,
    logoFileName,
    logo,
    favicon,
    sha256: sha256(JSON.stringify([sha256(values), sha256(logo), sha256(favicon)])),
  };
}

function readIdentity(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !['organization', 'service', 'highlight', 'notice'].includes(k))) {
    throw new Error('Ugyldig avsenderprofil (identity).');
  }
  const item = value as Record<string, unknown>;
  const highlight = readText(item.highlight, 'identity.highlight', 7);
  if (!/^#[a-f\d]{6}$/i.test(highlight)) throw new Error('identity.highlight må være #RRGGBB.');
  return { organization: readText(item.organization, 'identity.organization', 80),
    service: readText(item.service, 'identity.service', 48), highlight,
    notice: item.notice === undefined ? null : readText(item.notice, 'identity.notice', 150) };
}

export function readCustomerInstallation(path: string) {
  const file = readFileSync(path);
  const data = readRecord(file, ['id', 'profile', 'supabaseUrl', 'supabasePublishableKey']);
  const id = readText(data.id, 'id', 64);
  const profile = readText(data.profile, 'profile', 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*\/r[1-9]\d*$/.test(profile)) {
    throw new Error('Ugyldig instans-ID eller profilreferanse. Eksempel: demo-test og demo/r1.');
  }
  const supabaseUrl = readCustomerOrigin(data.supabaseUrl);
  const supabasePublishableKey = readText(data.supabasePublishableKey, 'supabasePublishableKey', 200);
  if (!/^sb_publishable_[a-z\d_-]+$/i.test(supabasePublishableKey)) {
    throw new Error('Kundebygget krever en publiserbar sb_publishable_-nøkkel.');
  }
  return { id, profile, supabaseUrl, supabasePublishableKey, sha256: sha256(file) };
}

export function readCustomerOrigin(value: unknown) {
  const address = readText(value, 'supabaseUrl', 250);
  const url = URL.parse(address);
  if (!url || url.protocol !== 'https:' || url.username || url.password ||
      url.href !== `${url.origin}/` || ![url.origin, `${url.origin}/`].includes(address)) {
    throw new Error('supabaseUrl må være en HTTPS-origin uten sti, parametre eller påloggingsdata.');
  }
  return url.origin;
}

export function sha256(bytes: string | Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readFile(directory: string, name: string, maxKiB = 256) {
  const path = join(directory, name);
  const file = lstatSync(path, { throwIfNoEntry: false });
  if (!file?.isFile() || file.size === 0 || file.size > maxKiB * 1024) {
    throw new Error(`Profilen mangler en vanlig, ikke-tom fil ${name} (maks ${maxKiB} KiB).`);
  }
  return readFileSync(path);
}

function readPngLogo(directory: string) {
  const png = readFile(directory, 'logo.png', 2048);
  if (png.length < 45 || !png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
      png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('logo.png må være en PNG-fil.');
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height || width > 4096 || height > 4096) {
    throw new Error('logo.png må ha en bredde og høyde mellom 1 og 4096 piksler.');
  }
  return png;
}

function readSvg(directory: string, name: string) {
  const svg = readFile(directory, name).toString('utf8');
  const tags = svg.matchAll(/<\/?([^\s/>]+)/g);
  // Reviewed artwork only: accept basic shapes and no active or external content.
  if (!/^\s*<svg(?:\s|>)/i.test(svg) || !/<\/svg>\s*$/i.test(svg) ||
      /[\w:-]*href\s*=|\s(?:on[\w:-]+|style|xmlns:[\w-]+)\s*=|\burl\s*\(|<\?|<!|&/i.test(svg) ||
      Array.from(tags, (tag) => tag[1]).some((tag) => !staticSvgTags.has(tag))) {
    throw new Error(`${name} må være en enkel, statisk SVG uten lenker, skript eller eksterne avhengigheter.`);
  }
  return svg;
}

function readRecord(file: Buffer, allowedKeys: string[]): Record<string, unknown> {
  let data;
  try {
    data = JSON.parse(file.toString('utf8'));
  } catch {
    throw new Error('Ugyldig JSON i kundeprofil eller installasjonsfil.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some((key) => !allowedKeys.includes(key))) {
    throw new Error('Kundeprofilen eller installasjonsfila inneholder en ukjent innstilling.');
  }
  return data;
}

function readText(value: unknown, field: string, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() ||
      value.length > limit || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`Feltet ${field} må være en ikke-tom tekst på maks ${limit} tegn.`);
  }
  return value;
}

function whiteContrast(accent: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(accent.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.05 + channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722);
}
