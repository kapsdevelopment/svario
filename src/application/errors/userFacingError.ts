type UserFacingErrorOptions = {
  fallback: string;
};

type KnownMessage = {
  match: string | RegExp;
  message: string;
};

const knownMessages: KnownMessage[] = [
  {
    match: /^invalid login credentials$/i,
    message: 'Feil e-post eller passord.',
  },
  {
    match: /^email not confirmed$/i,
    message: 'E-posten er ikke bekreftet ennå.',
  },
  {
    match: /user already (registered|exists)/i,
    message: 'Det finnes allerede en konto med denne e-posten.',
  },
  {
    match: /password should be at least|weak password|password is too short/i,
    message: 'Passordet er for kort.',
  },
  {
    match: /unable to validate email address|invalid email/i,
    message: 'Skriv inn en gyldig e-postadresse.',
  },
  {
    match: /email rate limit exceeded|rate limit/i,
    message: 'Det er gjort for mange forsøk på kort tid. Prøv igjen senere.',
  },
  {
    match: /for security purposes, you can only request this after/i,
    message: 'Vent litt før du prøver igjen.',
  },
  {
    match: /token has expired|otp expired|expired or invalid/i,
    message: 'Lenken er utløpt eller ugyldig.',
  },
  {
    match: /error sending .*email|email provider/i,
    message: 'Kunne ikke sende e-post akkurat nå. Prøv igjen litt senere.',
  },
  {
    match: /^signups not allowed|signup is disabled/i,
    message: 'Nye kontoer er ikke åpnet akkurat nå.',
  },
  {
    match: /auth session missing|jwt expired|invalid refresh token/i,
    message: 'Økten har utløpt. Logg inn på nytt.',
  },
  {
    match: /new password should be different/i,
    message: 'Det nye passordet må være forskjellig fra det gamle.',
  },
  {
    match: /^not authenticated\.?$/i,
    message: 'Du må logge inn på nytt.',
  },
  {
    match: /^account is not initialized\.?$/i,
    message: 'Kontoen er ikke klargjort ennå. Prøv å logge inn på nytt.',
  },
  {
    match: /^failed to create account mapping for authenticated user$/i,
    message: 'Kontoen kunne ikke klargjøres. Prøv igjen om litt.',
  },
  {
    match: /^supabase er ikke konfigurert\.$/i,
    message: 'Svario er ikke ferdig konfigurert.',
  },
  {
    match: /^survey link is missing\.?$/i,
    message: 'Skjemalenken mangler.',
  },
  {
    match: /^survey link is too long\.?$/i,
    message: 'Skjemalenken er ugyldig.',
  },
  {
    match: /^survey is not available for responses\.?$/i,
    message: 'Skjemaet er ikke åpent for svar.',
  },
  {
    match: /^identified surveys require respondent name or email\.?$/i,
    message: 'Skriv inn navn eller e-post før du sender inn.',
  },
  {
    match: /^respondent name can be at most 160 characters\.?$/i,
    message: 'Navnet kan maks være 160 tegn.',
  },
  {
    match: /^respondent email can be at most 320 characters\.?$/i,
    message: 'E-postadressen kan maks være 320 tegn.',
  },
  {
    match: /^a response can contain at most 250 answers\.?$/i,
    message: 'Svaret inneholder for mange svar.',
  },
  {
    match: /^response payload is too large\.?$/i,
    message: 'Svaret er for stort til å sendes inn.',
  },
  {
    match: /^free-text answers can be at most 10000 characters\.?$/i,
    message: 'Et fritekstsvar kan maks være 10000 tegn.',
  },
  {
    match: /^each question can only be answered once\.?$/i,
    message: 'Hvert spørsmål kan bare besvares en gang.',
  },
  {
    match: /^answer references an unknown question\.?$/i,
    message: 'Skjemaet er endret. Last inn siden på nytt og prøv igjen.',
  },
  {
    match: /^answer includes choices that do not belong to the question\.?$/i,
    message: 'Ett av svarene er ikke gyldig for skjemaet. Last inn siden på nytt og prøv igjen.',
  },
  {
    match: /^this question only allows one choice\.?$/i,
    message: 'Et spørsmål tillater bare ett valg.',
  },
  {
    match: /^unsupported question type\.?$/i,
    message: 'Skjemaet inneholder et spørsmål som ikke støttes ennå.',
  },
  {
    match: /^survey structure is locked because the survey has submitted responses\.?$/i,
    message: 'Skjemastrukturen er låst fordi skjemaet har innsendte svar.',
  },
  {
    match: /^survey identity is locked because the survey has submitted responses\.?$/i,
    message: 'Svarmodus og eier er låst fordi skjemaet har innsendte svar.',
  },
  {
    match: /^survey not found or not manageable by current account\.?$/i,
    message: 'Fant ikke skjemaet, eller du har ikke tilgang til å endre det.',
  },
  {
    match: /^survey not found or not readable by current account\.?$/i,
    message: 'Fant ikke skjemaet, eller du har ikke tilgang til det.',
  },
  {
    match: /^survey not found or not owned by current account\.?$/i,
    message: 'Fant ikke skjemaet, eller du eier det ikke.',
  },
  {
    match: /^survey not found\.?$/i,
    message: 'Fant ikke skjemaet.',
  },
  {
    match: /^only draft surveys can be published\.?$/i,
    message: 'Bare utkast kan publiseres.',
  },
  {
    match: /^current account cannot repeat this survey\.?$/i,
    message: 'Du har ikke tilgang til å repetere dette skjemaet.',
  },
  {
    match: /^question order is required\.?|^question order contains|^question order must include/i,
    message: 'Kunne ikke lagre rekkefølgen. Last inn siden på nytt og prøv igjen.',
  },
  {
    match: /^section not found for survey\.?$/i,
    message: 'Fant ikke seksjonen i dette skjemaet.',
  },
  {
    match: /^workspace name is required\.?$/i,
    message: 'Arbeidsflaten må ha et navn.',
  },
  {
    match: /^business workspaces require a valid organization number\.?$/i,
    message: 'Bedrift må ha et gyldig organisasjonsnummer.',
  },
  {
    match: /^organization number must be 9 digits\.?$/i,
    message: 'Organisasjonsnummeret må være 9 siffer.',
  },
  {
    match: /^a workspace already exists for this organization number\.?$/i,
    message:
      'Det finnes allerede en arbeidsflate for dette organisasjonsnummeret.',
  },
  {
    match: /^you already have access to a workspace with this organization number\.?$/i,
    message:
      'Du har allerede tilgang til en arbeidsflate med dette organisasjonsnummeret.',
  },
  {
    match: /^only workspace owners and admins can update organization number\.?$/i,
    message: 'Bare eiere og administratorer kan oppdatere organisasjonsnummer.',
  },
  {
    match: /^only business workspaces can have an organization number\.?$/i,
    message: 'Bare bedriftsarbeidsflater kan ha organisasjonsnummer.',
  },
  {
    match: /^workspace already has an organization number\.?$/i,
    message: 'Arbeidsflaten har allerede et organisasjonsnummer.',
  },
  {
    match: /^owner invitations are not supported\.?$/i,
    message: 'Eier-invitasjoner støttes ikke.',
  },
  {
    match: /^only workspace owners and admins can invite members\.?$/i,
    message: 'Bare eiere og administratorer kan invitere medlemmer.',
  },
  {
    match: /^invitation token is required\.?$/i,
    message: 'Invitasjonslenken mangler token.',
  },
  {
    match: /^invitation is invalid or expired\.?$/i,
    message: 'Invitasjonen er ugyldig eller utløpt.',
  },
  {
    match: /^only workspace owners and admins can remove members\.?$/i,
    message: 'Bare eiere og administratorer kan fjerne medlemmer.',
  },
  {
    match: /^only owners can remove owners\.?$/i,
    message: 'Bare eiere kan fjerne andre eiere.',
  },
  {
    match: /^cannot remove the last workspace owner\.?$/i,
    message: 'Arbeidsflaten må ha minst en eier.',
  },
  {
    match: /^workspace not found\.?$/i,
    message: 'Fant ikke arbeidsflaten.',
  },
  {
    match: /^only workspace owners can delete workspaces\.?$/i,
    message: 'Bare eiere kan slette arbeidsflater.',
  },
  {
    match: /^transfer workspace ownership before deleting this account\.?$/i,
    message: 'Overfør eierskap til arbeidsflater før du sletter kontoen.',
  },
  {
    match: /^begrunnelse er påkrevd når lagringstiden forlenges\.$/i,
    message: 'Begrunnelse er påkrevd når lagringstiden forlenges.',
  },
  {
    match: /^samtykke må bekreftes før svaret kan sendes inn\.$/i,
    message: 'Samtykke må bekreftes før svaret kan sendes inn.',
  },
  {
    match: /^skjemaet må ha minst ett spørsmål før publisering\.$/i,
    message: 'Skjemaet må ha minst ett spørsmål før publisering.',
  },
  {
    match: /^fyll ut behandlingsansvarlig, formål, rettslig grunnlag og lagringstid før publisering\.$/i,
    message:
      'Fyll ut behandlingsansvarlig, formål, rettslig grunnlag og lagringstid før publisering.',
  },
  {
    match: /^slutttidspunkt må være etter starttidspunkt\.$/i,
    message: 'Slutttidspunkt må være etter starttidspunkt.',
  },
  {
    match: /^du har ikke tilgang til å opprette skjema her\.$/i,
    message: 'Du har ikke tilgang til å opprette skjema her.',
  },
  {
    match: /^skjemaet må ha en tittel\.$/i,
    message: 'Skjemaet må ha en tittel.',
  },
  {
    match: /^skjemaet mangler lenke\.$/i,
    message: 'Skjemaet mangler lenke.',
  },
];

const technicalMessagePatterns = [
  /violates .*constraint/i,
  /duplicate key value violates/i,
  /row-level security/i,
  /permission denied/i,
  /invalid input syntax/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /function .* does not exist/i,
  /schema cache/i,
  /json object requested/i,
  /postgrest/i,
  /\bPGRST\d*\b/i,
  /failed to fetch/i,
  /networkerror/i,
  /edge function returned/i,
  /database error/i,
];

export function getUserFacingErrorMessage(
  error: unknown,
  options: UserFacingErrorOptions | string = 'Noe gikk galt. Prøv igjen.',
) {
  const fallback = typeof options === 'string' ? options : options.fallback;
  const message = getErrorMessage(error);

  if (!message) {
    return fallback;
  }

  const requiredAnswerMessage = mapMissingRequiredAnswer(message);

  if (requiredAnswerMessage) {
    return requiredAnswerMessage;
  }

  const scaleRangeMessage = mapScaleRangeMessage(message);

  if (scaleRangeMessage) {
    return scaleRangeMessage;
  }

  const knownMessage = knownMessages.find(({ match }) =>
    typeof match === 'string' ? match === message : match.test(message),
  );

  if (knownMessage) {
    return knownMessage.message;
  }

  if (isTechnicalMessage(message)) {
    return fallback;
  }

  return message;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();
    return getJsonErrorMessage(message) ?? message;
  }

  return null;
}

function getJsonErrorMessage(message: string) {
  if (!message.startsWith('{')) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(message) as { message?: unknown };
    return typeof parsedValue.message === 'string'
      ? parsedValue.message.trim()
      : null;
  } catch {
    return null;
  }
}

function mapMissingRequiredAnswer(message: string) {
  const match = /^missing required answer: (.+)$/i.exec(message);

  if (!match) {
    return null;
  }

  return `Svar på "${match[1]}" før du sender inn.`;
}

function mapScaleRangeMessage(message: string) {
  const match = /^scale values must be between (\d+) and (\d+)\.$/i.exec(message);

  if (!match) {
    return null;
  }

  return `Velg en verdi mellom ${match[1]} og ${match[2]}.`;
}

function isTechnicalMessage(message: string) {
  return technicalMessagePatterns.some((pattern) => pattern.test(message));
}
