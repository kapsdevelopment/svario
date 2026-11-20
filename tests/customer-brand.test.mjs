import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readCustomerBrand, readCustomerInstallation, readCustomerOrigin } from '../build/customerBrand.ts';

const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path d="M0 1h2"/></svg>';
const brand = { schemaVersion: 1, name: 'En ny kunde', description: 'Eksempel', tagline: 'Skjema', accent: '#31565d' };
const installation = {
  id: 'demo-test', profile: 'demo/r1', supabaseUrl: 'https://kunde.example',
  supabasePublishableKey: 'sb_publishable_DEMO_NOT_A_REAL_KEY',
};

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'svario-brand-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'brand.json'), JSON.stringify(brand));
  writeFileSync(join(dir, 'logo.svg'), logo);
  writeFileSync(join(dir, 'favicon.svg'), logo);
  writeFileSync(join(dir, 'install.json'), JSON.stringify(installation));
  return dir;
}

test('sender identity is opt-in; validates every field including decorative color', t => {
  const dir = fixture(t), file = join(dir, 'brand.json');
  assert.equal(readCustomerBrand(dir).identity, null);
  const identity = {organization: 'Eksempel', service: 'Skjemaportal', highlight: '#d47b22'};
  writeFileSync(file, JSON.stringify({...brand, identity}));
  assert.deepEqual(readCustomerBrand(dir).identity, {...identity, notice: null});
  for (const invalid of [null, [], {...identity, url:'unsafe'}, {...identity, highlight:'red;'}, {...identity, notice:''}]) {
    writeFileSync(file, JSON.stringify({...brand, identity: invalid}));
    assert.throws(() => readCustomerBrand(dir));
  }
});

test('the profile hash changes only when profile content changes', (t) => {
  const dir = fixture(t);
  const first = readCustomerBrand(dir);
  assert.equal(first.name, brand.name);
  assert.equal(first.sha256, readCustomerBrand(fixture(t)).sha256);
  writeFileSync(join(dir, 'logo.svg'), logo.replace('M0 1h2', 'M0 0h2'));
  assert.notEqual(first.sha256, readCustomerBrand(dir).sha256);
});

test('rejects active SVGs and low-contrast accent colors', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'logo.svg'), '<svg><script>alert(1)</script></svg>');
  assert.throws(() => readCustomerBrand(dir), /statisk SVG/);
  writeFileSync(join(dir, 'brand.json'), JSON.stringify({ ...brand, accent: '#eeeeee' }));
  assert.throws(() => readCustomerBrand(dir), /kontrast/);
});

test('accepts a PNG presentation logo and rejects ambiguous or oversized artwork', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'brand.json'), JSON.stringify({ ...brand, presentationOnly: true }));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9m8AAAAASUVORK5CYII=', 'base64');
  writeFileSync(join(dir, 'logo.png'), png);
  assert.throws(() => readCustomerBrand(dir), /ikke begge/);
  rmSync(join(dir, 'logo.svg'));
  const result = readCustomerBrand(dir);
  assert.equal(result.presentationOnly, true);
  assert.equal(result.logoFileName, 'logo.png');
  assert.deepEqual(result.logo, png);
  png.writeUInt32BE(4097, 16);
  writeFileSync(join(dir, 'logo.png'), png);
  assert.throws(() => readCustomerBrand(dir), /4096/);
  writeFileSync(join(dir, 'logo.png'), '<svg></svg>');
  assert.throws(() => readCustomerBrand(dir), /må være en PNG-fil/);
});

test('requires exact approved profile references and a browser-safe Supabase key', (t) => {
  const dir = fixture(t);
  const file = join(dir, 'install.json');
  assert.equal(readCustomerInstallation(file).profile, 'demo/r1');
  writeFileSync(file, JSON.stringify({ ...installation, supabasePublishableKey: 'sb_secret_not_allowed' }));
  assert.throws(() => readCustomerInstallation(file), /publiserbar/);
  writeFileSync(file, JSON.stringify({ ...installation, profile: '../r1' }));
  assert.throws(() => readCustomerInstallation(file), /profilreferanse/);
  writeFileSync(file, JSON.stringify({ ...installation, smtpPassword: 'not-allowed' }));
  assert.throws(() => readCustomerInstallation(file), /ukjent innstilling/);
});

test('requires a same-origin HTTPS address without path or credentials', () => {
  assert.equal(readCustomerOrigin('https://kunde.example/'), 'https://kunde.example');
  for (const url of ['http://kunde.example', 'https://kunde.example/path', 'https://kunde.example/?',
    'https://kunde.example/#', 'https://user:pass@kunde.example', 'https://kunde.example/../']) {
    assert.throws(() => readCustomerOrigin(url), /HTTPS-origin/);
  }
});
