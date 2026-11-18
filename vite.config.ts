import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  customerIconPath,
  customerStylePath,
  readCustomerBrand,
  readCustomerInstallation,
} from './build/customerBrand';

export default defineConfig(({ mode }) => {
  if (mode !== 'customer') {
    return { base: '/', plugins: [react()] };
  }

  const directory = process.env.SVARIO_CUSTOMER_PROFILE_DIR;
  const instanceFile = process.env.SVARIO_CUSTOMER_INSTANCE_FILE;
  if (!directory || !instanceFile) {
    throw new Error('Bruk npm run package:customer for å bygge med en kundeprofil.');
  }
  const brand = readCustomerBrand(directory);
  const instance = readCustomerInstallation(instanceFile);
  const browserValue = (value: string) => brand.presentationOnly ? 'undefined' : JSON.stringify(value);
  return {
    base: '/',
    publicDir: false,
    // Customer builds accept only the explicit browser values below, not VITE_* from .env.local.
    envPrefix: [],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': browserValue(instance.supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': browserValue(instance.supabasePublishableKey),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': 'undefined',
      'import.meta.env.VITE_AUTH_REDIRECT_URL': browserValue(`${instance.supabaseUrl}/`),
      'import.meta.env.VITE_CUSTOMER_BRAND': JSON.stringify({
        name: brand.name,
        tagline: brand.tagline,
        logoUrl: `/brand/${brand.logoFileName}`,
        presentationOnly: brand.presentationOnly,
      }),
    },
    plugins: [react(), customerBrandPlugin(brand, instance.supabaseUrl)],
  };
});

function customerBrandPlugin(brand: ReturnType<typeof readCustomerBrand>, origin: string): Plugin {
  return {
    name: 'svario-customer-brand',
    transformIndexHtml(html) {
      const customerHtml = html.replace(
        /<title>[^<]*<\/title>|<meta\s+(?:name="(?:description|theme-color|twitter:[^\"]+)"|property="og:[^\"]+")[^>]*>|<link\s+rel="(?:icon|apple-touch-icon)"[^>]*>/g,
        '',
      );
      const title = escapeHtml(brand.name);
      const description = escapeHtml(brand.description);
      return customerHtml.replace('</head>', `  <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="${brand.accent}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:site_name" content="${title}" />
    <meta property="og:description" content="${description}" />
    ${brand.presentationOnly ? '<meta name="robots" content="noindex, nofollow" />' : `<meta property="og:url" content="${escapeHtml(origin)}/" />`}
    <link rel="icon" href="/${customerIconPath}" type="image/svg+xml" />
    <link rel="stylesheet" href="/${customerStylePath}" />
  </head>`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: `brand/${brand.logoFileName}`, source: brand.logo });
      this.emitFile({ type: 'asset', fileName: customerIconPath, source: brand.favicon });
      this.emitFile({ type: 'asset', fileName: customerStylePath, source: `:root{--svario-customer-accent:${brand.accent}}\n` });
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
