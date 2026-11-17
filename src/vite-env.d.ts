/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CUSTOMER_BRAND?: {
    name: string;
    tagline: string;
    logoUrl: string;
    presentationOnly: boolean;
  };
}
