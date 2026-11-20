export const minimumPasswordLength = 6;

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < minimumPasswordLength) {
    return `Passordet må være minst ${minimumPasswordLength} tegn.`;
  }

  if (password !== confirmation) {
    return 'Passordene er ikke like. Skriv det samme passordet i begge feltene.';
  }

  return null;
}
