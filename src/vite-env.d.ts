/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CUSTOMER_BRAND?: {
    name: string;
    identity?: { organization: string; service: string; highlight: string; notice: string | null } | null;
    tagline: string;
    logoUrl: string;
    presentationOnly: boolean;
  };
}
