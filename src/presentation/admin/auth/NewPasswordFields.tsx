import { useId } from 'react';

import { minimumPasswordLength } from '../../../domain/auth/passwordValidation';

type NewPasswordFieldsProps = {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  disabled: boolean;
  isReset?: boolean;
};

export function NewPasswordFields({
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  disabled,
  isReset = false,
}: NewPasswordFieldsProps) {
  const hintId = useId();

  return (
    <>
      <label>
        {isReset ? 'Nytt passord' : 'Passord'}
        <input
          aria-describedby={hintId}
          autoComplete="new-password"
          disabled={disabled}
          minLength={minimumPasswordLength}
          name="new-password"
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <p className="auth-field-hint" id={hintId}>
        Bruk minst {minimumPasswordLength} tegn.
      </p>
      <label>
        {isReset ? 'Gjenta nytt passord' : 'Gjenta passord'}
        <input
          autoComplete="new-password"
          disabled={disabled}
          minLength={minimumPasswordLength}
          name="confirm-password"
          onChange={(event) => onConfirmationChange(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </label>
    </>
  );
}
