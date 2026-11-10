# Poolteam-app

Ledenapp voor poolteams op CueScore: volgende wedstrijd, aanmelden, speelvoorkeur, opstelling (wedstrijdformulier) en stand.
Elk team heeft een eigen adres: `https://rijkenk.github.io/poolteam-app/<team>/`.

## Hoe het werkt
- `teams/<team>.json`: alle gegevens van een team (naam, CueScore-team en -competitie, spelers, wie de opstelling maakt, kleuren).
- `app/template.html` en `app/sw.js`: de app zelf, gelijk voor alle teams.
- `scripts/build.mjs` maakt daaruit per team een map met `index.html`, manifest en service worker.
- GitHub Actions (`CueScore bijwerken`) haalt elk uur schema en stand op en bouwt de pagina's opnieuw.
- Supabase (`config.js`): opgaves, opstelling en persoonlijke codes, gescheiden per team (kolom `team`).

## Nieuw team toevoegen
1. Maak `teams/<team>.json` (kopieer een bestaand team) en zet logo en iconen in `<team>/`.
2. Voeg de spelers met codes toe in Supabase (zie `supabase-teams.sql`, stap 2).
3. Push: de Action haalt de CueScore-gegevens op en zet de pagina online.

## Database opnieuw opzetten
`supabase.sql`, daarna `supabase-spelerscodes.sql`, daarna `supabase-teams.sql`.
