Anmeldeportal für den Nikolausbesuch in Nofels. [Next.js](https://nextjs.org), gehostet auf Netlify.

## Anmeldungen

Das Formular nutzt **Netlify Forms** – kein eigener Server, keine Secrets im
Frontend-Code.

- Die statische Datei `public/__forms.html` registriert das Formular (`nikolaus-anmeldung`)
  und seine Felder beim Netlify-Build. Sie wird niemals angezeigt.
- Die React-Seite (`app/page.tsx`) sendet die Daten als `POST` an `/__forms.html`.
  Feldliste in beiden Dateien synchron halten.
- Eingegangene Anmeldungen: **Netlify → Site → Forms**. Dort als CSV exportierbar;
  Benachrichtigungen (E-Mail/Slack) unter *Forms → Settings & notifications*.
- Lokal (`npm run dev`) schlägt das Absenden mit einem 405 fehl – das ist normal,
  Netlify Forms greift nur im Deploy. Zum lokalen Testen `netlify dev` verwenden.

### PDF-Anhang je Anmeldung

Nach jeder (nicht als Spam markierten) Anmeldung ruft Netlify automatisch die
Funktion `netlify/functions/submission-created.mjs` auf. Sie baut aus der
Anmeldung ein übersichtliches A4-PDF (`pdf-lib`) und schickt es per Gmail
(`nodemailer`) als E-Mail-Anhang – zusätzlich zur normalen Netlify-Benachrichtigung.

Benötigte Umgebungsvariablen (in **Netlify → Site configuration → Environment
variables**, nicht im Repo – siehe `.env.example`):

| Variable | Zweck |
| --- | --- |
| `EMAIL_USER` | Gmail-Adresse, die die Mail sendet |
| `EMAIL_PASS` | Gmail App-Passwort (16 Zeichen) |
| `NOTIFY_EMAIL` | Empfänger (optional, sonst `EMAIL_USER`) |

Fehlen die Variablen, wird das PDF still übersprungen – die Anmeldung geht
trotzdem nicht verloren (Netlify-Dashboard + Standard-Benachrichtigung).

PDF-Layout und Handler lokal testen (kein Mailversand):

```bash
node scripts/test-anmeldung-pdf.mjs ./test-output
```


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
