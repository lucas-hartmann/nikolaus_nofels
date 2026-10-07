import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/* A4 in PostScript points */
const PAGE = [595.28, 841.89];
const M = 50; // page margin
const FOOTER = 34; // space kept free at the bottom for the page footer
const LABEL_W = 120; // label column width for the compact rows

/* Only the people are set large (20 pt, for reading on paper); contact,
   appointment and closing data stay compact at 11 pt. */
const BASE = 11;
const BASE_LINE = 15;
const PERSON = 20;
const PERSON_LINE = 26;
const TITLE = 18;
const SECTION = 12;
const FOOT_SIZE = 9;

const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.32, 0.3, 0.28);
const ACCENT = rgb(0.54, 0.1, 0.1);
const GOLD = rgb(0.72, 0.57, 0.27);
const HAIRLINE = rgb(0.8, 0.78, 0.75);

/* pdf-lib's standard Helvetica uses WinAnsi encoding, which covers German
   umlauts and common typographic punctuation. Anything outside it would throw,
   so fold the few characters our form can realistically produce. */
function clean(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/\t/g, "  ")
    // last resort: drop anything still outside the Latin-1 range
    .replace(/[^\x09\x0A\x20-\xFF]/g, "");
}

/* Break a single over-long word (no spaces) so it can never overflow the page. */
function breakWord(word, font, size, maxWidth) {
  const parts = [];
  let current = "";
  for (const ch of word) {
    if (current && font.widthOfTextAtSize(current + ch, size) > maxWidth) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function wrapLine(text, font, size, maxWidth) {
  const lines = [];
  let current = "";
  for (const word of text.split(/ +/)) {
    const pieces =
      font.widthOfTextAtSize(word, size) > maxWidth
        ? breakWord(word, font, size, maxWidth)
        : [word];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function wrapText(text, font, size, maxWidth) {
  return clean(text)
    .split("\n")
    .flatMap((paragraph) => wrapLine(paragraph, font, size, maxWidth));
}

/**
 * @param {{
 *   name?: string, telefon?: string, adresse?: string,
 *   terminTag?: string, terminZeit?: string,
 *   ausweichTag?: string, ausweichZeit?: string,
 *   einwilligung?: string,
 *   personen?: Array<{vorname?:string, alter?:string, lob?:string, vorlieben?:string}>,
 *   eingegangen?: Date,
 * }} data
 * @returns {Promise<Uint8Array>}
 */
export async function buildAnmeldungPdf(data) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  pdf.setTitle("Nikolaus-Anmeldung");
  pdf.setProducer("nikolausnofels.netlify.app");

  const width = PAGE[0];
  const contentW = width - M * 2;
  const bottom = M + FOOTER;

  let page = pdf.addPage(PAGE);
  let y = PAGE[1] - M;

  const room = (needed) => {
    if (y - needed < bottom) {
      page = pdf.addPage(PAGE);
      y = PAGE[1] - M;
    }
  };

  const hr = (color = HAIRLINE, thickness = 0.75) => {
    page.drawLine({
      start: { x: M, y },
      end: { x: width - M, y },
      thickness,
      color,
    });
  };

  /* One line of text; y ends on the baseline of the line just drawn. */
  const line = (str, { f = font, color = INK, size, lineH, x = M }) => {
    room(lineH);
    y -= lineH;
    page.drawText(clean(str), { x, y, size, font: f, color });
  };

  const section = (title) => {
    room(SECTION + 40);
    y -= 14;
    line(title, { f: bold, color: ACCENT, size: SECTION, lineH: SECTION + 4 });
    y -= 5;
    hr(GOLD, 1.25);
    y -= 4;
  };

  /* Compact 11 pt row: bold label on the left, wrapped value on the right. */
  const row = (label, value) => {
    const lines = wrapText(value || "-", font, BASE, contentW - LABEL_W);
    room(BASE_LINE * Math.min(lines.length, 2));
    const top = y;
    line(label, { f: bold, color: MUTED, size: BASE, lineH: BASE_LINE });
    y = top;
    lines.forEach((l) =>
      line(l, { size: BASE, lineH: BASE_LINE, x: M + LABEL_W }),
    );
    y -= 4;
  };

  /* 20 pt block used for the people. */
  const big = (str, f = font, color = INK) =>
    wrapText(str, f, PERSON, contentW).forEach((l) =>
      line(l, { f, color, size: PERSON, lineH: PERSON_LINE }),
    );

  // ---- Header ---------------------------------------------------------------
  const eingegangen = data.eingegangen ?? new Date();
  y -= TITLE;
  page.drawText(`Nikolaus-Anmeldung ${eingegangen.getFullYear()}`, {
    x: M,
    y,
    size: TITLE,
    font: bold,
    color: ACCENT,
  });
  y -= 10;
  hr(GOLD, 1.5);

  // ---- Kontakt --------------------------------------------------------------
  section("Kontakt");
  row("Name", data.name);
  row("Telefon", data.telefon);
  row("Adresse", data.adresse);

  // ---- Termin ---------------------------------------------------------------
  section("Termin");
  row(
    "Wunschtermin",
    [data.terminTag, data.terminZeit].filter(Boolean).join("  ·  "),
  );
  row(
    "Ausweichtermin",
    [data.ausweichTag, data.ausweichZeit].filter(Boolean).join("  ·  "),
  );

  // ---- Personen (20 pt) -----------------------------------------------------
  const personen = Array.isArray(data.personen) ? data.personen : [];
  section(`Personen im Haus (${personen.length})`);

  personen.forEach((p, index) => {
    // keep the person heading together with its first label + text line
    room(PERSON_LINE * 4);
    if (index > 0) {
      y -= 6;
      hr();
      y -= 8;
    }
    big(
      `${index + 1}.  ${clean(p.vorname) || "-"}${
        p.alter ? `   (${clean(p.alter)})` : ""
      }`,
      bold,
    );
    y -= 4;
    big("Lob", bold, MUTED);
    big(p.lob || "-");
    y -= 6;
    room(PERSON_LINE * 2);
    big("Hobbys, Vorlieben & Interessen", bold, MUTED);
    big(p.vorlieben || "-");
    y -= 10;
  });

  if (personen.length === 0) {
    line("Keine Personen angegeben.", {
      f: italic,
      color: MUTED,
      size: BASE,
      lineH: BASE_LINE,
    });
  }

  // ---- Abschluss ------------------------------------------------------------
  section("Abschluss");
  row(
    "Einwilligung",
    data.einwilligung
      ? `${data.einwilligung} (Daten nur zur Organisation des Besuchs)`
      : "-",
  );
  row(
    "Eingegangen",
    eingegangen.toLocaleString("de-AT", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Vienna",
    }),
  );

  // ---- Footer on every page ---------------------------------------------------
  const pages = pdf.getPages();
  const who = clean(data.name) || "Anmeldung";
  pages.forEach((pg, i) => {
    pg.drawText(`Nikolaus-Anmeldung - ${who}`, {
      x: M,
      y: M - 6,
      size: FOOT_SIZE,
      font,
      color: MUTED,
      maxWidth: contentW - 90,
    });
    const label = `Seite ${i + 1} / ${pages.length}`;
    pg.drawText(label, {
      x: width - M - font.widthOfTextAtSize(label, FOOT_SIZE),
      y: M - 6,
      size: FOOT_SIZE,
      font,
      color: MUTED,
    });
  });

  return pdf.save();
}

/** Plain-text e-mail body mirroring the PDF, for the notification mail. */
export function buildAnmeldungText(data) {
  const personen = Array.isArray(data.personen) ? data.personen : [];
  const lines = [
    `Neue Nikolaus-Anmeldung`,
    ``,
    `Name:     ${data.name || "-"}`,
    `Telefon:  ${data.telefon || "-"}`,
    `Adresse:  ${data.adresse || "-"}`,
    ``,
    `Wunschtermin:    ${[data.terminTag, data.terminZeit].filter(Boolean).join(" ") || "-"}`,
    `Ausweichtermin:  ${[data.ausweichTag, data.ausweichZeit].filter(Boolean).join(" ") || "-"}`,
    ``,
    `Personen im Haus (${personen.length}):`,
  ];
  personen.forEach((p, i) => {
    lines.push(
      `  ${i + 1}. ${p.vorname || "-"}${p.alter ? ` (${p.alter})` : ""}`,
      `     Lob: ${p.lob || "-"}`,
      `     Hobbys / Vorlieben / Interessen: ${p.vorlieben || "-"}`,
    );
  });
  lines.push(
    ``,
    `Einwilligung: ${data.einwilligung || "-"}`,
    ``,
    `Die vollständige Anmeldung ist als druckfertiges A4-PDF angehängt.`,
  );
  return lines.join("\n");
}

/** Safe-ish file name fragment from the family name. */
export function slugName(name) {
  return (
    clean(name)
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "Anmeldung"
  );
}

/** Fallback: rebuild the person list from the human-readable text field. */
export function parsePersonenText(input) {
  const blocks = clean(input)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const people = [];
  for (const block of blocks) {
    const head = block.match(/^Person\s+\d+:\s*(.+?)\s*(?:\(([^)]*)\))?\s*$/m);
    const lob = block.match(/Lob:\s*(.*)$/m);
    const hobby = block.match(
      /Hobbys\s*\/\s*Vorlieben\s*\/\s*Interessen:\s*(.*)$/m,
    );
    if (head) {
      people.push({
        vorname: (head[1] || "").trim(),
        alter: (head[2] || "").trim(),
        lob: (lob?.[1] || "").trim(),
        vorlieben: (hobby?.[1] || "").trim(),
      });
    }
  }
  return people;
}
