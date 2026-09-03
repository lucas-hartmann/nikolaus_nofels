"use client";

import React, { useId, useRef, useState } from "react";

interface Person {
  id: string;
  vorname: string;
  alter: string;
  lob: string;
  vorlieben: string;
}

const TAGE = [
  { value: "Freitag, 4.12.", label: "Freitag, 4. Dez." },
  { value: "Samstag, 5.12.", label: "Samstag, 5. Dez." },
  { value: "Sonntag, 6.12.", label: "Sonntag, 6. Dez." },
] as const;

const ZEITEN = [
  { value: "16.30 - 18.00", label: "16:30 – 18:00 Uhr" },
  { value: "18.00 - 19.30", label: "18:00 – 19:30 Uhr" },
  { value: "ab 19.30 Uhr", label: "ab 19:30 Uhr" },
] as const;

const MAX_PERSONEN = 25;

/* Netlify Forms: this name must match the hidden static form in
   public/__forms.html so the build bot registers it. */
const FORM_NAME = "nikolaus-anmeldung";

const encode = (data: Record<string, string>) =>
  Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
    .join("&");

const emptyPerson = (id: string): Person => ({
  id,
  vorname: "",
  alter: "",
  lob: "",
  vorlieben: "",
});

/* Shared control styles — 16px+ text avoids iOS Safari zoom-on-focus,
   a persistent border makes every field a visible affordance. */
const fieldBase =
  "w-full rounded-xl border border-line bg-card px-4 py-3.5 text-[16px] text-ink " +
  "placeholder:text-ink-3 transition-colors outline-none " +
  "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25";

const labelBase = "block text-[15px] font-medium text-ink-2 mb-2";

const eyebrow =
  "text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-ink";

const helpText = "text-[14px] leading-relaxed text-ink-3";

/* A large, tap-friendly single choice (replaces the tiny dropdowns) */
function Choice({
  name,
  options,
  value,
  onChange,
  disabledValue,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabledValue?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const isDisabled = opt.value === disabledValue;
        return (
          <label
            key={opt.value}
            className={
              "relative flex min-h-12 items-center justify-center rounded-xl border px-3 py-3 text-center text-[15px] transition-colors " +
              (isDisabled
                ? "cursor-not-allowed border-line bg-paper text-ink-3/60 line-through"
                : value === opt.value
                  ? "cursor-pointer border-accent bg-accent/5 font-semibold text-accent"
                  : "cursor-pointer border-line bg-card text-ink-2 hover:border-ink-3")
            }
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={isDisabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

export default function NikolausAnmeldung() {
  const formId = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const personCounter = useRef(1);

  const [formData, setFormData] = useState({
    name: "",
    adresse: "",
    telefon: "",
    terminTag: "",
    terminZeit: "",
    ausweichTag: "",
    ausweichZeit: "",
    "bot-field": "", // honeypot — real people never fill this
  });

  const [personen, setPersonen] = useState<Person[]>([emptyPerson("p0")]);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setField = (key: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // Picking a Wunschtermin day clears an Ausweichtermin day that would collide.
  const handleWunschTag = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      terminTag: value,
      ausweichTag: prev.ausweichTag === value ? "" : prev.ausweichTag,
    }));

  const handlePersonChange = (
    id: string,
    field: keyof Omit<Person, "id">,
    value: string,
  ) => {
    setPersonen((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const addPerson = () => {
    setPersonen((prev) =>
      prev.length >= MAX_PERSONEN
        ? prev
        : [...prev, emptyPerson(`p${personCounter.current++}`)],
    );
  };

  const removePerson = (id: string) => {
    setPersonen((prev) =>
      prev.length > 1 ? prev.filter((p) => p.id !== id) : prev,
    );
  };

  const fail = (message: string) => {
    setStatus({ type: "error", message });
    statusRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStatus({ type: null, message: "" });

    if (
      !formData.name.trim() ||
      !formData.adresse.trim() ||
      !formData.telefon.trim()
    ) {
      return fail("Bitte füllen Sie Name, Adresse und Telefon aus.");
    }

    const phoneRegex = /^[+0-9\s/-]{6,25}$/;
    if (!phoneRegex.test(formData.telefon.trim())) {
      return fail(
        "Bitte geben Sie eine gültige Telefonnummer ein (z. B. 0699 12345678).",
      );
    }

    if (!formData.terminTag || !formData.terminZeit) {
      return fail("Bitte wählen Sie einen Wunschtermin (Tag und Uhrzeit).");
    }

    if (!formData.ausweichTag || !formData.ausweichZeit) {
      return fail(
        "Bitte wählen Sie einen Ausweichtermin (Tag und Uhrzeit) an einem anderen Tag.",
      );
    }

    if (formData.ausweichTag === formData.terminTag) {
      return fail(
        "Der Ausweichtermin muss an einem anderen Tag als der Wunschtermin liegen.",
      );
    }

    for (let i = 0; i < personen.length; i++) {
      const p = personen[i];
      if (
        !p.vorname.trim() ||
        !p.alter.trim() ||
        !p.lob.trim() ||
        !p.vorlieben.trim()
      ) {
        return fail(
          `Bitte vervollständigen Sie die Angaben für Person ${i + 1} (Vorname, Alter, Lob, Hobbys).`,
        );
      }
    }

    if (!consent) {
      return fail(
        "Bitte bestätigen Sie, dass Ihre Angaben zur Organisation des Besuchs verwendet werden dürfen.",
      );
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: "Anmeldung wird übermittelt …" });

    const tagLabel = (v: string) =>
      TAGE.find((t) => t.value === v)?.label ?? v;
    const zeitLabel = (v: string) =>
      ZEITEN.find((z) => z.value === v)?.label ?? v;

    const personenText = personen
      .map(
        (p, i) =>
          `Person ${i + 1}: ${p.vorname.trim()} (${p.alter.trim()})\n` +
          `  Lob: ${p.lob.trim()}\n` +
          `  Hobbys / Vorlieben / Interessen: ${p.vorlieben.trim()}`,
      )
      .join("\n\n");

    try {
      // Netlify captures the POST to the static form path /__forms.html
      const response = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({
          "form-name": FORM_NAME,
          "bot-field": formData["bot-field"],
          name: formData.name.trim(),
          telefon: formData.telefon.trim(),
          adresse: formData.adresse.trim(),
          terminTag: tagLabel(formData.terminTag),
          terminZeit: zeitLabel(formData.terminZeit),
          ausweichTag: tagLabel(formData.ausweichTag),
          ausweichZeit: zeitLabel(formData.ausweichZeit),
          anzahlPersonen: String(personen.length),
          personen: personenText,
          einwilligung: "Ja",
        }),
      });

      if (!response.ok) throw new Error(String(response.status));

      setStatus({
        type: "success",
        message:
          "Vielen Dank – Ihre Anmeldung wurde übermittelt. Bei Fragen zur Einteilung melden wir uns telefonisch.",
      });
      setFormData({
        name: "",
        adresse: "",
        telefon: "",
        terminTag: "",
        terminZeit: "",
        ausweichTag: "",
        ausweichZeit: "",
        "bot-field": "",
      });
      setPersonen([emptyPerson("p0")]);
      personCounter.current = 1;
      setConsent(false);
    } catch {
      setStatus({
        type: "error",
        message:
          "Die Übertragung ist fehlgeschlagen. Bitte versuchen Sie es später erneut oder melden Sie sich telefonisch.",
      });
    } finally {
      setIsSubmitting(false);
      statusRef.current?.focus();
    }
  };

  return (
    <main className="relative z-10 text-ink selection:bg-accent/10 selection:text-accent">
      {/* Hero */}
      <header className="mx-auto max-w-4xl px-5 pt-20 pb-14 text-center sm:px-8 sm:pt-32 sm:pb-24">
        <p className={eyebrow}>Nikolausverein Nofels</p>
        <h1 className="mt-6 font-serif text-[2.375rem] leading-[1.12] tracking-tight text-ink sm:text-6xl md:text-7xl">
          Der Nikolausbesuch
          <br />
          <span className="italic text-accent">in Nofels.</span>
        </h1>
        <div className="mx-auto my-7 h-px w-16 bg-gold/50" />
        <p className="mx-auto max-w-2xl font-serif text-xl italic leading-relaxed text-ink-2 sm:text-2xl">
          „Wir besuchen Sie auch in diesem Jahr, wenn Sie es wünschen.“
        </p>
      </header>

      {/* Info */}
      <section className="mx-auto mb-20 grid max-w-5xl gap-10 px-5 sm:mb-32 sm:px-8 md:grid-cols-2 md:gap-16">
        <div className="space-y-5">
          <h2 className="border-b border-ink/10 pb-4 font-serif text-2xl text-ink sm:text-[1.75rem]">
            Frohbotschaft statt Drohbotschaft
          </h2>
          <p className="text-[17px] leading-relaxed text-ink-2">
            Groß sind die Erwartungen und Vorfreuden, aber auch Ängste der Kinder
            auf den Nikolausabend hin.
          </p>
          <p className="text-[17px] leading-relaxed text-ink-2">
            Dabei kommt dem Nikolaus neben den Eltern eine besondere
            Verantwortung zu. Der Heilige Nikolaus ist der Überbringer der frohen
            Botschaft.
          </p>
        </div>

        <div className="space-y-6 rounded-3xl border border-line bg-card p-7 shadow-sm sm:p-10">
          <h2 className="font-serif text-2xl text-ink">Zeitlicher Rahmen</h2>
          <dl className="space-y-3.5 text-[16px]">
            <div className="flex items-center justify-between gap-4 border-b border-line-soft pb-3.5">
              <dt className="text-ink-2">Besuchstage</dt>
              <dd className="text-right font-medium">4., 5. &amp; 6. Dezember</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line-soft pb-3.5">
              <dt className="text-ink-2">Uhrzeit</dt>
              <dd className="text-right font-medium">jeweils ab 16:30 Uhr</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-semibold text-accent">Anmeldeschluss</dt>
              <dd className="text-right font-semibold text-accent">
                Di, 1. Dez, 17:00 Uhr
              </dd>
            </div>
          </dl>
          <p className="text-[14px] leading-relaxed text-ink-3">
            Die freiwilligen Spenden werden ausnahmslos für soziale Fälle im Dorf
            verwendet.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8 sm:pb-40">
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="font-serif text-[1.75rem] tracking-tight text-ink sm:text-4xl">
            Anmeldeformular {new Date().getFullYear()}
          </h2>
          <p className="mt-3 text-[15px] text-ink-2">
            Pflichtfelder sind mit&nbsp;* gekennzeichnet.
          </p>
        </div>

        <form
          name={FORM_NAME}
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-16"
        >
          {/* Netlify needs this in the POST body to route the submission */}
          <input type="hidden" name="form-name" value={FORM_NAME} />

          {/* Honeypot — hidden from people, catches bots */}
          <p className="hidden">
            <label>
              Bitte dieses Feld leer lassen:{" "}
              <input
                name="bot-field"
                tabIndex={-1}
                autoComplete="off"
                value={formData["bot-field"]}
                onChange={handleInputChange}
              />
            </label>
          </p>

          {/* 01 — Kontakt */}
          <fieldset className="space-y-6">
            <legend className={`${eyebrow} mb-2 w-full border-b border-line pb-3`}>
              01 · Kontaktdaten
            </legend>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor={`${formId}-name`} className={labelBase}>
                  Name *
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={120}
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Familie Muster"
                  className={fieldBase}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-telefon`} className={labelBase}>
                  Telefon *
                </label>
                <input
                  id={`${formId}-telefon`}
                  type="tel"
                  name="telefon"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={25}
                  value={formData.telefon}
                  onChange={handleInputChange}
                  placeholder="0699 12345678"
                  className={fieldBase}
                />
              </div>
            </div>
            <div>
              <label htmlFor={`${formId}-adresse`} className={labelBase}>
                Adresse *
              </label>
              <input
                id={`${formId}-adresse`}
                type="text"
                name="adresse"
                autoComplete="street-address"
                maxLength={200}
                value={formData.adresse}
                onChange={handleInputChange}
                placeholder="Straße, Hausnummer, Ort"
                className={fieldBase}
              />
            </div>
          </fieldset>

          {/* 02 — Termin */}
          <fieldset className="space-y-8">
            <legend className={`${eyebrow} mb-2 w-full border-b border-line pb-3`}>
              02 · Termin
            </legend>

            {/* Wunschtermin */}
            <div className="space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <p className="text-[15px] font-semibold text-accent">
                Wunschtermin *
              </p>
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-ink-2">Tag</p>
                <Choice
                  name="wunsch-tag"
                  options={TAGE}
                  value={formData.terminTag}
                  onChange={handleWunschTag}
                />
              </div>
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-ink-2">Uhrzeit</p>
                <Choice
                  name="wunsch-zeit"
                  options={ZEITEN}
                  value={formData.terminZeit}
                  onChange={(v) => setField("terminZeit", v)}
                />
              </div>
            </div>

            {/* Ausweichtermin */}
            <div className="space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <p className="text-[15px] font-semibold text-ink">
                Ausweichtermin *
              </p>
              <p className={helpText}>
                Muss an einem <strong className="text-ink-2">anderen Tag</strong>{" "}
                als der Wunschtermin liegen.
              </p>
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-ink-2">Tag</p>
                <Choice
                  name="ausweich-tag"
                  options={TAGE}
                  value={formData.ausweichTag}
                  onChange={(v) => setField("ausweichTag", v)}
                  disabledValue={formData.terminTag}
                />
              </div>
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-ink-2">Uhrzeit</p>
                <Choice
                  name="ausweich-zeit"
                  options={ZEITEN}
                  value={formData.ausweichZeit}
                  onChange={(v) => setField("ausweichZeit", v)}
                />
              </div>
            </div>

            <p className={helpText}>
              Der gewünschte Termin ist verbindlich. Bei größeren
              Überschreitungen des Zeitrahmens verständigen wir Sie telefonisch.
            </p>
          </fieldset>

          {/* 03 — Personen */}
          <fieldset className="space-y-6">
            <legend className="mb-2 w-full border-b border-line pb-3">
              <span className={eyebrow}>03 · Personen im Haus</span>
            </legend>
            <p className={helpText}>
              Bitte alle Anwesenden anführen – Kinder, Eltern, Verwandte, Freunde
              und Nachbarn.
            </p>

            <div className="space-y-5">
              {personen.map((person, index) => (
                <div
                  key={person.id}
                  className="space-y-5 rounded-3xl border border-line bg-card p-5 sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[16px] italic text-gold-ink">
                      Person {index + 1}
                    </span>
                    {personen.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerson(person.id)}
                        className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-accent hover:bg-accent/5"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`${formId}-vorname-${person.id}`}
                        className={labelBase}
                      >
                        Vorname *
                      </label>
                      <input
                        id={`${formId}-vorname-${person.id}`}
                        type="text"
                        autoComplete="off"
                        maxLength={80}
                        placeholder="z. B. Lukas"
                        value={person.vorname}
                        onChange={(e) =>
                          handlePersonChange(person.id, "vorname", e.target.value)
                        }
                        className={fieldBase}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formId}-alter-${person.id}`}
                        className={labelBase}
                      >
                        Alter *
                      </label>
                      <input
                        id={`${formId}-alter-${person.id}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={40}
                        placeholder="z. B. 6 Jahre"
                        value={person.alter}
                        onChange={(e) =>
                          handlePersonChange(person.id, "alter", e.target.value)
                        }
                        className={fieldBase}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`${formId}-lob-${person.id}`}
                        className={labelBase}
                      >
                        Lob *
                      </label>
                      <textarea
                        id={`${formId}-lob-${person.id}`}
                        rows={2}
                        maxLength={600}
                        placeholder="Lobenswerte Eigenschaften, schöne Momente aus dem Jahr …"
                        value={person.lob}
                        onChange={(e) =>
                          handlePersonChange(person.id, "lob", e.target.value)
                        }
                        className={`${fieldBase} resize-y`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`${formId}-vorlieben-${person.id}`}
                        className={labelBase}
                      >
                        Hobbys, Vorlieben &amp; Interessen *
                      </label>
                      <textarea
                        id={`${formId}-vorlieben-${person.id}`}
                        rows={3}
                        maxLength={1000}
                        placeholder="Woran hat die Person Freude? Sport, Musik, Tiere, Spiele …"
                        value={person.vorlieben}
                        onChange={(e) =>
                          handlePersonChange(
                            person.id,
                            "vorlieben",
                            e.target.value,
                          )
                        }
                        className={`${fieldBase} resize-y`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {personen.length < MAX_PERSONEN && (
              <button
                type="button"
                onClick={addPerson}
                className="min-h-12 w-full rounded-2xl border border-dashed border-line px-4 text-[15px] font-medium text-ink-2 transition-colors hover:border-ink-3 hover:bg-card hover:text-ink"
              >
                + Person hinzufügen
              </button>
            )}
          </fieldset>

          {/* Consent + submit */}
          <div className="space-y-6 border-t border-line pt-8">
            <label className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-accent"
              />
              <span>
                Ich bin damit einverstanden, dass die angegebenen Daten
                ausschließlich zur Organisation des Nikolausbesuchs verwendet und
                nach der Saison gelöscht werden.
              </span>
            </label>

            <div
              ref={statusRef}
              tabIndex={-1}
              role="status"
              aria-live="polite"
              className="outline-none"
            >
              {status.message && (
                <div
                  className={
                    "rounded-xl border p-4 text-center text-[15px] font-medium " +
                    (status.type === "success"
                      ? "border-ok-line bg-ok-bg text-ok-ink"
                      : status.type === "error"
                        ? "border-err-line bg-err-bg text-err-ink"
                        : "border-line bg-card text-ink-2")
                  }
                >
                  {status.message}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="min-h-[3.75rem] w-full rounded-2xl bg-ink px-8 text-[17px] font-medium text-white transition-all hover:bg-black active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Wird gesendet …" : "Anmeldung verbindlich senden"}
            </button>

            <p className="text-center text-[13px] text-ink-3">
              Die Übertragung erfolgt verschlüsselt über HTTPS.
            </p>
          </div>
        </form>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-card px-5 py-16 text-[15px] text-ink-2 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-10 leading-relaxed md:flex-row md:justify-between">
          <div className="space-y-3">
            <p className="font-serif text-[16px] text-ink">Nikolausteam Nofels</p>
            <p className="max-w-xs">
              Bei Fragen oder Unklarheiten zur Einteilung stehen wir Ihnen gerne
              telefonisch zur Seite.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-ink">Ansprechpartnerinnen</p>
            <p>
              Helene Müller:{" "}
              <a href="tel:+436991227554" className="text-ink hover:underline">
                0699 122 755 64
              </a>
            </p>
            <p>
              Barbara Stieger:{" "}
              <a href="tel:+4369910444490" className="text-ink hover:underline">
                0699 10 44 44 90
              </a>
            </p>
            <p className="pt-2">
              E-Mail:{" "}
              <a
                href="mailto:nikolaus.nofels@outlook.com"
                className="font-medium text-accent hover:underline"
              >
                nikolaus.nofels@outlook.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
