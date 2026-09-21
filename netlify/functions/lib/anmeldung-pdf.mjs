import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/* A4 in PostScript points */
const PAGE = [595.28, 841.89];
const M = 50; // page margin
const FOOTER = 34; // space kept free at the bottom for the page footer

/* Print-friendly sizing: all content text is 20pt. */
const SIZE = 20;
const LINE = 26;
const TITLE = 30;
const FOOT_SIZE = 14;

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

  /* One baseline of text; y marks the baseline of the line just drawn. */
  const line = (str, f = font, color = INK, size = SIZE) => {
    room(LINE);
    y -= LINE;
    page.drawText(clean(str), { x: M, y, size, font: f, color });
  };

  const paragraph = (str, f = font, color = INK) => {
    for (const l of wrapText(str, f, SIZE, contentW)) line(l, f, color);
  };

  /* Bold label followed by its value underneath. Label + first value line
     stay together on one page. */
  const field = (label, value) => {
    room(LINE * 2);
    line(label, bold, MUTED);
    paragraph(value || "-");
    y -= 10;
  };

  const section = (title) => {
    room(LINE * 3);
    y -= 14;
    line(title, bold, ACCENT);
    y -= 6;
    hr(GOLD, 1.25);
    y -= 8;
  };

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
  y -= 14;
  hr(GOLD, 1.5);
  y -= 6;

  // ---- Kontakt --------------------------------------------------------------
  section("Kontakt");
  field("Name", data.name);
  field("Telefon", data.telefon);
  field("Adresse", data.adresse);

  // ---- Termin ---------------------------------------------------------------
  section("Termin");
  field(
    "Wunschtermin",
    [data.terminTag, data.terminZeit].filter(Boolean).join("  ·  "),
  );
  field(
    "Ausweichtermin",
    [data.ausweichTag, data.ausweichZeit].filter(Boolean).join("  ·  "),
  );

  // ---- Personen -------------------------------------------------------------
  const personen = Array.isArray(data.personen) ? data.personen : [];
  section(`Personen im Haus (${personen.length})`);

  personen.forEach((p, index) => {
    // keep the person heading together with its first label + text line
    room(LINE * 4);
    if (index > 0) {
      y -= 6;
      hr();
      y -= 10;
    }
    line(
      `${index + 1}.  ${clean(p.vorname) || "-"}${
        p.alter ? `   (${clean(p.alter)})` : ""
      }`,
      bold,
      INK,
    );
    y -= 4;
    line("Lob", bold, MUTED);
    paragraph(p.lob || "-");
    y -= 6;
    room(LINE * 2);
    line("Hobbys, Vorlieben & Interessen", bold, MUTED);
    paragraph(p.vorlieben || "-");
    y -= 10;
  });

  if (personen.length === 0) {
    line("Keine Personen angegeben.", italic, MUTED);
  }

  // ---- Abschluss ------------------------------------------------------------
  section("Abschluss");
  field(
    "Einwilligung",
    data.einwilligung
      ? `${data.einwilligung} (Daten nur zur Organisation des Besuchs)`
      : "-",
  );
  field(
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
    `Die vollständige Anmeldung ist als druckfertiges A4-PDF (Schriftgröße 20) angehängt.`,
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
