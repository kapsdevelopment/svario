import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  isPending?: boolean;
  confirmationText?: string;
  confirmationLabel?: string;
  confirmationPlaceholder?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Avbryt',
  variant = 'default',
  isPending = false,
  confirmationText,
  confirmationLabel,
  confirmationPlaceholder,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [inputValue, setInputValue] = useState('');
  const requiresConfirmationText = Boolean(confirmationText);
  const canConfirm =
    !isPending &&
    (!requiresConfirmationText ||
      inputValue.trim() === confirmationText);
  const Icon = variant === 'danger' ? AlertTriangle : CheckCircle2;

  useEffect(() => {
    if (!open) {
      return;
    }

    setInputValue('');
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (requiresConfirmationText) {
        inputRef.current?.focus();
        return;
      }

      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open, requiresConfirmationText]);

  useEffect(() => {
    if (!open || isPending) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPending, onCancel, open]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    onConfirm();
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation">
      <form
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-dialog"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className={`confirm-dialog__icon confirm-dialog__icon--${variant}`}>
          <Icon size={22} aria-hidden="true" />
        </div>

        <div className="confirm-dialog__content">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>

        {requiresConfirmationText ? (
          <label className="confirm-dialog__field">
            {confirmationLabel ?? `Skriv ${confirmationText} for å bekrefte`}
            <input
              ref={inputRef}
              autoComplete="off"
              disabled={isPending}
              placeholder={confirmationPlaceholder ?? confirmationText}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
          </label>
        ) : null}

        <div className="confirm-dialog__actions">
          <button
            ref={cancelButtonRef}
            className="button button--secondary"
            disabled={isPending}
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={
              variant === 'danger'
                ? 'button button--danger'
                : 'button button--primary'
            }
            disabled={!canConfirm}
            type="submit"
          >
            {isPending ? 'Jobber...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
