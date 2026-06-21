export type Profile = {
  id: string;
  displayName: string | null;
  contactEmail: string | null;
};

export type UpdateProfileInput = {
  accountId: string;
  displayName: string | null;
};
