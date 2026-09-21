/*
 * Local test harness for the Nikolaus PDF + submission-created function.
 * No network / e-mail is sent (DRY_RUN=1). Run:  node scripts/test-anmeldung-pdf.mjs [outDir]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildAnmeldungPdf,
  buildAnmeldungText,
  parsePersonenText,
  slugName,
} from "../netlify/functions/lib/anmeldung-pdf.mjs";

const OUT = process.argv[2] || join(process.cwd(), "test-output");
mkdirSync(OUT, { recursive: true });

let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${msg}`);
  if (!cond) failed++;
};
const isPdf = (bytes) =>
  bytes && bytes.length > 800 && Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-";

const person = (vorname, alter, lob, vorlieben) => ({
  vorname,
  alter,
  lob,
  vorlieben,
});

/* ---------------------------------------------------------------- scenarios */

const scenarios = {
  "01-normal": {
    name: "Familie Müller-Öhringer",
    telefon: "0699 12345678",
    adresse: "Rheinstraße 12b, 6800 Feldkirch-Nofels",
    terminTag: "Freitag, 5. Dez.",
    terminZeit: "16:30 – 18:00 Uhr",
    ausweichTag: "Samstag, 6. Dez.",
    ausweichZeit: "18:00 – 19:30 Uhr",
    einwilligung: "Ja",
    personen: [
      person("Lukas", "6 Jahre", "Sehr hilfsbereit, räumt sein Zimmer auf.", "Fußball, Lego, Dinosaurier"),
      person("Lina", "12 Jahre", "Kümmert sich liebevoll um ihren kleinen Bruder.", "Reiten, Zeichnen, Klavier"),
    ],
    eingegangen: new Date("2026-11-20T18:12:00"),
  },

  "02-long-text-wrapping": {
    name: "Familie Kaufmann",
    telefon: "+43 660 0000000",
    adresse: "Eine ungewöhnlich lange Straßenbezeichnung 145, Stiege 3, Top 27, 6800 Nofels bei Feldkirch",
    terminTag: "Sonntag, 7. Dez.",
    terminZeit: "ab 19:30 Uhr",
    ausweichTag: "Freitag, 5. Dez.",
    ausweichZeit: "16:30 – 18:00 Uhr",
    einwilligung: "Ja",
    personen: [
      person(
        "Maximilian",
        "9 Jahre",
        "Maximilian hat dieses Jahr besonders viel Rücksicht auf seine Großeltern genommen, hilft beim Tischdecken, übt fleißig Blockflöte und hat in der Schule trotz einiger schwieriger Wochen nie den Mut verloren.",
        "Er interessiert sich für Astronomie, sammelt Steine und Mineralien, spielt im Verein Handball, liebt Gesellschaftsspiele mit der ganzen Familie und würde am liebsten den ganzen Tag im Wald Hütten bauen.",
      ),
    ],
    eingegangen: new Date("2026-11-21T09:03:00"),
  },

  "03-pagination-22-personen": {
    name: "Großfamilie Nachbarschaftstreffen",
    telefon: "0664 1112223",
    adresse: "Dorfplatz 1, Nofels",
    terminTag: "Samstag, 6. Dez.",
    terminZeit: "18:00 – 19:30 Uhr",
    ausweichTag: "Sonntag, 7. Dez.",
    ausweichZeit: "ab 19:30 Uhr",
    einwilligung: "Ja",
    personen: Array.from({ length: 22 }, (_, i) =>
      person(
        `Person ${i + 1}`,
        `${3 + i} Jahre`,
        `Lobenswerte Eigenschaft Nummer ${i + 1}: war das ganze Jahr über sehr freundlich.`,
        `Hobbys von Person ${i + 1}: Basteln, Singen, Vorlesen, draußen spielen.`,
      ),
    ),
    eingegangen: new Date("2026-12-01T20:45:00"),
  },

  "04-minimal-empty-personen": {
    name: "",
    telefon: "0699 1",
    adresse: "",
    terminTag: "Freitag, 5. Dez.",
    terminZeit: "16:30 – 18:00 Uhr",
    ausweichTag: "Samstag, 6. Dez.",
    ausweichZeit: "16:30 – 18:00 Uhr",
    einwilligung: "Ja",
    personen: [],
    eingegangen: new Date("2026-11-01T00:00:00"),
  },
};

console.log("\n=== buildAnmeldungPdf ===");
for (const [key, data] of Object.entries(scenarios)) {
  const bytes = await buildAnmeldungPdf(data);
  const file = join(OUT, `${key}.pdf`);
  writeFileSync(file, bytes);
  ok(isPdf(bytes), `${key} -> valid PDF (${bytes.length} bytes) : ${file}`);
}

/* --------------------------------------------------- parsePersonenText round-trip */

console.log("\n=== parsePersonenText ===");
const serialized = scenarios["01-normal"].personen
  .map(
    (p, i) =>
      `Person ${i + 1}: ${p.vorname} (${p.alter})\n` +
      `  Lob: ${p.lob}\n` +
      `  Hobbys / Vorlieben / Interessen: ${p.vorlieben}`,
  )
  .join("\n\n");
const parsed = parsePersonenText(serialized);
ok(parsed.length === 2, `parsed 2 people (got ${parsed.length})`);
ok(parsed[0].vorname === "Lukas", `person 1 vorname = "${parsed[0]?.vorname}"`);
ok(parsed[0].alter === "6 Jahre", `person 1 alter = "${parsed[0]?.alter}"`);
ok(
  parsed[1].vorlieben === "Reiten, Zeichnen, Klavier",
  `person 2 vorlieben = "${parsed[1]?.vorlieben}"`,
);

/* --------------------------------------------------------- slugName */

console.log("\n=== buildAnmeldungText ===");
const body = buildAnmeldungText(scenarios["01-normal"]);
ok(body.includes("Personen im Haus (2)"), "text body has person count");
ok(
  body.includes("Lob: Sehr hilfsbereit") && body.includes("Hobbys / Vorlieben / Interessen:"),
  "text body has per-person lob + hobbys lines",
);
ok(body.includes("A4-PDF") && body.includes("angehängt"), "text body mentions the PDF attachment");

console.log("\n=== slugName ===");
ok(slugName("Familie Müller-Öhringer") === "Familie_Müller_Öhringer", slugName("Familie Müller-Öhringer"));
ok(slugName("") === "Anmeldung", `empty -> "${slugName("")}"`);
ok(slugName("  ///  ") === "Anmeldung", `junk -> "${slugName("  ///  ")}"`);

/* --------------------------------------------------------- handler (DRY_RUN) */

console.log("\n=== submission-created handler (DRY_RUN) ===");
process.env.DRY_RUN = "1";
const { handler } = await import("../netlify/functions/submission-created.mjs");

// a) full payload with personenJson
const fields = scenarios["01-normal"];
const evGood = {
  body: JSON.stringify({
    payload: {
      data: {
        name: fields.name,
        telefon: fields.telefon,
        adresse: fields.adresse,
        terminTag: fields.terminTag,
        terminZeit: fields.terminZeit,
        ausweichTag: fields.ausweichTag,
        ausweichZeit: fields.ausweichZeit,
        anzahlPersonen: "2",
        personen: serialized,
        personenJson: JSON.stringify(fields.personen),
        einwilligung: "Ja",
      },
    },
  }),
};
const r1 = await handler(evGood);
ok(r1.statusCode === 200, `statusCode 200 (got ${r1.statusCode})`);
ok(isPdf(r1.pdf), `handler produced a valid PDF (${r1.pdf?.length} bytes)`);
ok(/Personen im Haus \(2\)/.test(r1.text), "text body lists 2 people");
ok(r1.text.includes("Lukas") && r1.text.includes("Lina"), "text body has both names");
writeFileSync(join(OUT, "handler-01-personenJson.pdf"), r1.pdf);
writeFileSync(join(OUT, "handler-01-body.txt"), r1.text);

// b) payload WITHOUT personenJson -> must fall back to text parsing
const evNoJson = JSON.parse(evGood.body);
delete evNoJson.payload.data.personenJson;
const r2 = await handler({ body: JSON.stringify(evNoJson) });
ok(r2.statusCode === 200 && isPdf(r2.pdf), "fallback (text parse) still yields a PDF");
ok(/Personen im Haus \(2\)/.test(r2.text), "fallback text body lists 2 people");
writeFileSync(join(OUT, "handler-02-textfallback.pdf"), r2.pdf);

// c) malformed payload
const r3 = await handler({ body: "not json" });
ok(r3.statusCode === 400, `malformed payload -> 400 (got ${r3.statusCode})`);

// d) empty personen
const evEmpty = {
  body: JSON.stringify({ payload: { data: { name: "Test", personenJson: "[]" } } }),
};
const r4 = await handler(evEmpty);
ok(r4.statusCode === 200 && isPdf(r4.pdf), "empty personen still yields a PDF");
writeFileSync(join(OUT, "handler-04-empty.pdf"), r4.pdf);

console.log(
  `\n${failed === 0 ? "ALL PASSED" : failed + " CHECK(S) FAILED"} — PDFs in ${OUT}\n`,
);
process.exit(failed === 0 ? 0 : 1);
