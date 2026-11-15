import type { SurveyPrivacySettings } from '../../../domain/surveys/survey';

export function RespondentPrivacyNotice({
  isIdentified,
  privacySettings,
}: {
  isIdentified: boolean;
  privacySettings: Pick<
    SurveyPrivacySettings,
    'controllerName' | 'controllerContact' | 'purpose' | 'legalBasis' | 'retentionDays' | 'respondentNotice'
  >;
}) {
  return (
    <section className="respondent-privacy" aria-label="Personvern">
      {isIdentified ? (
        <p>
          Denne spørreundersøkelsen samler inn opplysninger som kan identifisere
          deg, for eksempel navn, e-postadresse eller lignende.
        </p>
      ) : null}
      {privacySettings.respondentNotice ? (
        <p>{privacySettings.respondentNotice}</p>
      ) : null}
      <details>
        <summary>Personvern</summary>
        <dl>
          {privacySettings.controllerName ? (
            <>
              <dt>Behandlingsansvarlig</dt>
              <dd>{privacySettings.controllerName}</dd>
            </>
          ) : null}
          {privacySettings.purpose ? (
            <>
              <dt>Formål</dt>
              <dd>{privacySettings.purpose}</dd>
            </>
          ) : null}
          {privacySettings.legalBasis ? (
            <>
              <dt>Rettslig grunnlag</dt>
              <dd>{getPrivacyLegalBasisLabel(privacySettings.legalBasis)}</dd>
            </>
          ) : null}
          {privacySettings.retentionDays ? (
            <>
              <dt>Lagringstid</dt>
              <dd>{formatRetentionDays(privacySettings.retentionDays)}</dd>
            </>
          ) : null}
          {privacySettings.controllerContact ? (
            <>
              <dt>Kontakt</dt>
              <dd>{privacySettings.controllerContact}</dd>
            </>
          ) : null}
        </dl>
      </details>
    </section>
  );
}

function getPrivacyLegalBasisLabel(
  legalBasis: NonNullable<SurveyPrivacySettings['legalBasis']>,
) {
  const labels = {
    consent: 'Samtykke',
    legitimate_interests: 'Berettiget interesse',
    contract: 'Avtale',
    legal_obligation: 'Rettslig plikt',
    public_task: 'Allmenn interesse / offentlig myndighet',
    other: 'Annet',
  } satisfies Record<NonNullable<SurveyPrivacySettings['legalBasis']>, string>;

  return labels[legalBasis];
}

function formatRetentionDays(days: number) {
  if (days === 30) {
    return '30 dager';
  }

  if (days === 90) {
    return '90 dager';
  }

  if (days === 180) {
    return '6 måneder';
  }

  if (days === 365) {
    return '12 måneder';
  }

  if (days === 730) {
    return '24 måneder';
  }

  return `${days} dager`;
}
