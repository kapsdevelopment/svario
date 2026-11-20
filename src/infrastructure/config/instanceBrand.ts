export const isCustomerBuild = import.meta.env.MODE === 'customer';

export const instanceBrand = import.meta.env.VITE_CUSTOMER_BRAND ?? {
  name: 'Svario',
  identity: null,
  tagline: 'Spørsmål og innsikt',
  logoUrl: null,
  presentationOnly: false,
};
