export type Profile = {
  id: string;
  personalName: string | null;
  contactEmail: string | null;
};

export type UpdateProfileInput = {
  accountId: string;
  personalName: string | null;
};
