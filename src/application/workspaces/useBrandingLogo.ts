import { useEffect, useRef, useState } from 'react';

import { validateBrandingLogo } from '../../infrastructure/files/brandingLogo';

export function useBrandingLogo() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const run = useRef(0);

  useEffect(() => () => { run.current += 1; }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function selectFile(selected: File | undefined) {
    const currentRun = ++run.current;
    setError(null);
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      setIsValidating(false);
      return;
    }
    setIsValidating(true);
    try {
      await validateBrandingLogo(selected);
      if (run.current === currentRun) {
        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
      }
    } catch (cause) {
      if (run.current === currentRun) {
        setError(cause instanceof Error ? cause.message : 'Kunne ikke lese logoen.');
      }
    } finally {
      if (run.current === currentRun) setIsValidating(false);
    }
  }

  return { file, previewUrl, error, isValidating, selectFile };
}
