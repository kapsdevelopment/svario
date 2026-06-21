# Underdatabehandlere

Status: arbeidsutkast. Må bekreftes før produksjon og holdes oppdatert.

Sist oppdatert: 21. juni 2026

Denne oversikten viser leverandører som kan behandle personopplysninger på vegne av Kapsdevelopment AS når Svario leveres til kunder. Oversikten er ment å gi kunden forutsigbarhet om formål, datatyper, region og relevant dokumentasjon.

## Liste

| Leverandør | Tjeneste/formål | Datatyper | Registrerte | Region | Status | Overføringsgrunnlag | Dokumentasjon |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Database, autentisering, Postgres API/RPC, edge functions og backend-drift | Kontoopplysninger, profiler, arbeidsflater, skjemaer, besvarelser, respondentopplysninger ved identifiserte skjemaer, tekniske driftsdata | Adminbrukere, respondenter og inviterte arbeidsflatemedlemmer | Primary region er Supabase North EU, Stockholm. Backup- og supportimplikasjoner må bekreftes mot valgt Supabase-plan | Obligatorisk | EU/EOS-region er valgt for primær behandling. Eventuelle tredjelandsoverføringer må vurderes mot Supabase DPA og underleverandøroversikt | https://supabase.com/legal/dpa |
| GitHub Pages | Hosting av statiske frontend-filer for Svario | Normalt ikke spørreskjemabesvarelser. Tekniske webserverlogger kan forekomme hos GitHub | Besøkende på Svario-nettstedet og respondenter som laster frontend | Må bekreftes | Obligatorisk dersom GitHub Pages brukes i produksjon | Må vurderes mot GitHub-vilkår og eventuelle overføringsgrunnlag | https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement |
| GitHub Actions | Bygg og deploy av frontend til GitHub Pages | Kildekode, build-artifakter og miljøvariabler som er nødvendige for deploy. Skal ikke inneholde service-role keys eller produksjonshemmeligheter | Adminbrukere kan indirekte berøres gjennom deploykonfigurasjon; respondenter normalt ikke | Må bekreftes | Obligatorisk dersom GitHub Actions brukes for deploy | Må vurderes mot GitHub-vilkår og eventuelle overføringsgrunnlag | https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement |

## Endringsrutine

Ved ny eller endret underdatabehandler skal Svario:

- vurdere formål, datatyper, registrerte, region og tilgangsnivå,
- kontrollere databehandleravtale eller tilsvarende vilkår,
- vurdere sikkerhetstiltak og om leverandøren har relevante sertifiseringer eller revisjonsrapporter,
- vurdere overføringsgrunnlag ved behandling utenfor EU/EOS,
- oppdatere denne listen før eller samtidig med endringen,
- informere kunder ved vesentlige endringer,
- gi kunden en rimelig mulighet til å protestere dersom endringen har saklig betydning for behandlingen.

## Prinsipper

Svario skal bruke færrest mulig underdatabehandlere for spørreskjemadata. Leverandører skal bare brukes når de er nødvendige for drift, sikkerhet, hosting, autentisering, database, deploy eller tilsvarende tjenesteleveranser.

Svario skal ikke bruke underdatabehandlere til annonsering, kommersiell datadeling eller trening av modeller på kunders spørreskjemabesvarelser.
