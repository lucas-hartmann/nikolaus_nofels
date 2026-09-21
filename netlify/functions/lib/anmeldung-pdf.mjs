import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/* A4 in PostScript points */
const PAGE = [595.28, 841.89];
const M = 56; // page margin
const LABEL_W = 120; // width of the label column
const GAP = 12; // gap between label and value column

const INK = rgb(0.11, 0.11, 0.1);
const MUTED = rgb(0.36, 0.34, 0.31);
const ACCENT = rgb(0.54, 0.1, 0.1);
const GOLD = rgb(0.72, 0.57, 0.27);
const HAIRLINE = rgb(0.88, 0.87, 0.85);
const BOXBG = rgb(0.98, 0.975, 0.965);

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
    .replace(/ /g, " ")
    .replace(/\t/g, "  ")
    // last resort: drop anything still outside the Latin-1 range
    .replace(/[^\x09\x0A\x20-\xFF]/g, "");
}

function wrapLine(text, font, size, maxWidth) {
  const words = text.split(/ +/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
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

  let page = pdf.addPage(PAGE);
  const width = PAGE[0];
  const contentW = width - M * 2;
  let y = PAGE[1] - M;

  const room = (needed) => {
    if (y - needed < M) {
      page = pdf.addPage(PAGE);
      y = PAGE[1] - M;
    }
  };

  const text = (str, x, size, f = font, color = INK) => {
    page.drawText(clean(str), { x, y, size, font: f, color });
  };

  const hr = (color = HAIRLINE, pad = 0) => {
    page.drawLine({
      start: { x: M + pad, y },
      end: { x: width - M - pad, y },
      thickness: 0.75,
      color,
    });
  };

  // ---- Header ---------------------------------------------------------------
  const year = (data.eingegangen ?? new Date()).getFullYear();
  text(`Nikolaus-Anmeldung ${year}`, M, 22, bold, ACCENT);
  y -= 12;
  hr(GOLD);
  y -= 28;

  // ---- Section helper -----------------------------------------------------
  const section = (title) => {
    room(46);
    text(title.toUpperCase(), M, 10.5, bold, GOLD);
    y -= 8;
    hr();
    y -= 20;
  };

  const row = (label, value) => {
    const size = 11;
    const lineH = 15;
    const lines = wrapText(value || "-", font, size, contentW - LABEL_W - GAP);
    room(Math.max(lineH, lines.length * lineH) + 6);
    text(label, M, size, bold, MUTED);
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: M + LABEL_W + GAP,
        y: y - i * lineH,
        size,
        font,
        color: INK,
      });
    });
    y -= lines.length * lineH + 8;
  };

  // ---- Kontakt -----------------------------------------------------------
  section("Kontakt");
  row("Name", data.name);
  row("Telefon", data.telefon);
  row("Adresse", data.adresse);
  y -= 10;

  // ---- Termin ----------------------------------------------------------
  section("Termin");
  row(
    "Wunschtermin",
    [data.terminTag, data.terminZeit].filter(Boolean).join("  ·  "),
  );
  row(
    "Ausweichtermin",
    [data.ausweichTag, data.ausweichZeit].filter(Boolean).join("  ·  "),
  );
  y -= 10;

  // ---- Personen --------------------------------------------------------
  const personen = Array.isArray(data.personen) ? data.personen : [];
  section(`Personen im Haus (${personen.length})`);

  personen.forEach((p, index) => {
    const size = 11;
    const lineH = 15;
    const innerW = contentW - 28;

    const nameLine = `${index + 1}.  ${clean(p.vorname) || "-"}${
      p.alter ? `   (${clean(p.alter)})` : ""
    }`;
    const lobLines = wrapText(`Lob:  ${p.lob || "-"}`, font, size, innerW);
    const hobbyLines = wrapText(
      `Hobbys / Vorlieben / Interessen:  ${p.vorlieben || "-"}`,
      font,
      size,
      innerW,
    );

    const blockH = 16 + (lobLines.length + hobbyLines.length) * lineH + 20;
    room(blockH + 8);

    const boxTop = y + 6;
    const boxBottom = y - (blockH - 12);
    page.drawRectangle({
      x: M,
      y: boxBottom,
      width: contentW,
      height: boxTop - boxBottom,
      color: BOXBG,
      borderColor: HAIRLINE,
      borderWidth: 0.75,
    });

    y -= 6;
    page.drawText(clean(nameLine), {
      x: M + 14,
      y,
      size: 11.5,
      font: bold,
      color: INK,
    });
    y -= lineH + 4;
    [...lobLines, ...hobbyLines].forEach((line) => {
      page.drawText(line, { x: M + 14, y, size, font, color: MUTED });
      y -= lineH;
    });
    y -= 16;
  });

  if (personen.length === 0) {
    text("Keine Personen angegeben.", M, 11, italic, MUTED);
    y -= 20;
  }

  // ---- Footer ---------------------------------------------------------
  y -= 8;
  room(50);
  hr();
  y -= 18;
  row(
    "Einwilligung",
    data.einwilligung
      ? `${data.einwilligung} (Daten nur zur Organisation des Besuchs)`
      : "-",
  );
  const stamp = (data.eingegangen ?? new Date()).toLocaleString("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  row("Eingegangen", stamp);

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
    `Die vollständige Anmeldung im A4-Format ist als PDF angehängt.`,
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
