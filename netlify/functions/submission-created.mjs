import nodemailer from "nodemailer";
import {
  buildAnmeldungPdf,
  buildAnmeldungText,
  parsePersonenText,
  slugName,
} from "./lib/anmeldung-pdf.mjs";

/*
 * Netlify fires this function automatically after a (non-spam) submission of a
 * Netlify Form. It rebuilds the submission into an A4 PDF and e-mails it as an
 * attachment, in addition to Netlify's own notification.
 *
 * Required environment variables (set in Netlify → Site configuration →
 * Environment variables, NOT in the repo):
 *   EMAIL_USER  – Gmail address that sends the mail
 *   EMAIL_PASS  – Gmail App password (16 chars)
 *   NOTIFY_EMAIL – recipient (optional; defaults to EMAIL_USER)
 */

export const handler = async (event) => {
  let data;
  try {
    data = JSON.parse(event.body).payload.data;
  } catch {
    return { statusCode: 400, body: "invalid submission payload" };
  }

  let personen = [];
  if (typeof data.personenJson === "string" && data.personenJson.trim()) {
    try {
      const parsed = JSON.parse(data.personenJson);
      if (Array.isArray(parsed)) personen = parsed;
    } catch {
      /* fall through to text parsing */
    }
  }
  if (personen.length === 0 && data.personen) {
    personen = parsePersonenText(data.personen);
  }

  const model = {
    name: data.name,
    telefon: data.telefon,
    adresse: data.adresse,
    terminTag: data.terminTag,
    terminZeit: data.terminZeit,
    ausweichTag: data.ausweichTag,
    ausweichZeit: data.ausweichZeit,
    einwilligung: data.einwilligung,
    personen,
    eingegangen: new Date(),
  };

  let pdf;
  try {
    pdf = await buildAnmeldungPdf(model);
  } catch (err) {
    console.error("submission-created: PDF generation failed", err);
    return { statusCode: 500, body: "pdf generation failed" };
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const to = process.env.NOTIFY_EMAIL || user;

  // Local test hook: skip the real send, hand the PDF back to the caller.
  if (process.env.DRY_RUN === "1") {
    return {
      statusCode: 200,
      body: "dry-run",
      pdf: Buffer.from(pdf),
      text: buildAnmeldungText(model),
    };
  }

  if (!user || !pass || !to) {
    // Don't fail the submission – just log; the Netlify notification still goes out.
    console.error(
      "submission-created: EMAIL_USER / EMAIL_PASS / NOTIFY_EMAIL not configured – skipping PDF mail",
    );
    return { statusCode: 200, body: "skipped: mail not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Nikolaus Anmeldung" <${user}>`,
      to,
      replyTo: data.telefon ? undefined : user,
      subject: `Nikolaus-Anmeldung: ${model.name || "ohne Namen"}`,
      text: buildAnmeldungText(model),
      attachments: [
        {
          filename: `Nikolaus-Anmeldung_${slugName(model.name)}.pdf`,
          content: Buffer.from(pdf),
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("submission-created: mail send failed", err);
    return { statusCode: 500, body: "mail send failed" };
  }

  return { statusCode: 200, body: "pdf mail sent" };
};
