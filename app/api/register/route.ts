import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, adresse, telefon, terminTag, terminZeit, ausweichTag, ausweichZeit, personen } = data;

    // 1. PDF im Speicher generieren
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // PDF Titel (Jahr aktualisiert sich automatisch passend zum Frontend)
      const currentYear = new Date().getFullYear();
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#8a1a1a').text(`Nikolaus – Anmeldung ${currentYear}`, { align: 'center' });
      doc.moveDown(2);

      // Stammdaten
      doc.fontSize(12).fillColor('#1c1b1a').font('Helvetica-Bold').text(`Name: `).font('Helvetica').text(name);
      doc.font('Helvetica-Bold').text(`Adresse: `).font('Helvetica').text(adresse);
      doc.font('Helvetica-Bold').text(`Telefon: `).font('Helvetica').text(telefon);
      doc.moveDown();

      // Terminkoordination direkt untereinander platziert
      doc.font('Helvetica-Bold').text('Gewünschter Termin (Hauptwunsch):');
      doc.font('Helvetica').text(`${terminTag || 'Kein Tag gewählt'} von ${terminZeit || 'Keine Uhrzeit gewählt'}`);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').text('Ausweichtermin:');
      doc.font('Helvetica').text(ausweichTag && ausweichZeit ? `${ausweichTag} von ${ausweichZeit}` : 'Kein Ausweichtermin angegeben');
      doc.moveDown(2);

      // Sektion: Anwesende Personen
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#8a1a1a').text('Anwesende Personen im Haus:');
      doc.moveDown(0.5);

      // Mapping korrigiert von p.lob/p.hobbys zu p.vorlieben
      personen.forEach((p: any, index: number) => {
        doc.fontSize(11).fillColor('#1c1b1a').font('Helvetica-Bold').text(`Person #${index + 1}: ${p.vorname || 'Ohne Name'} (${p.alter || 'Ohne Altersangabe'})`);
        doc.font('Helvetica').text(`Details (Hobbys, Vorlieben, Interessen): ${p.vorlieben || 'Keine Angaben hinterlegt'}`);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e8e6e1').stroke();
        doc.moveDown(0.5);
      });

      doc.end();
    });

    // 2. E-Mail Versand via Nodemailer für Gmail konfigurieren
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // E-Mail Optionen
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'nikolaus.nofels@outlook.com', 
      subject: `Neue Nikolaus-Anmeldung von Familie ${name}`,
      text: `Hallo Nikolausteam,\n\nanbei findest du eine neue Anmeldung von Familie ${name}.\nAlle Details entnehmst du bitte dem angehängten PDF.\n\nTelefon für Rückfragen: ${telefon}`,
      attachments: [
        {
          filename: `Anmeldung_${name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Fehler in der API-Route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}