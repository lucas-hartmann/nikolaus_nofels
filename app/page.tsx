"use client";

import React, { useState } from 'react';

interface Person {
  vorname: string;
  alter: string;
  vorlieben: string;
}

export default function NikolausAnmeldung() {
  const [formData, setFormData] = useState({
    name: '',
    adresse: '',
    telefon: '',
    terminTag: '',
    terminZeit: '',
    ausweichTag: '',
    ausweichZeit: '',
  });

  const [personen, setPersonen] = useState<Person[]>([
    { vorname: '', alter: '', vorlieben: '' }
  ]);

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePersonChange = (index: number, field: keyof Person, value: string) => {
    const updatedPersonen = [...personen];
    updatedPersonen[index][field] = value;
    setPersonen(updatedPersonen);
  };

  const addPerson = () => {
    setPersonen([...personen, { vorname: '', alter: '', vorlieben: '' }]);
  };

  const removePerson = (index: number) => {
    if (personen.length > 1) {
      setPersonen(personen.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    // 1. Überprüfung der Stammdaten (Dürfen nicht leer sein)
    if (
      !formData.name.trim() || 
      !formData.adresse.trim() || 
      !formData.telefon.trim() || 
      !formData.terminTag || 
      !formData.terminZeit
    ) {
      setStatus({ type: 'error', message: 'Bitte füllen Sie alle erforderlichen Felder (*) aus.' });
      return;
    }

    // 2. Telefonnummer genau validieren (Erlaubt Ziffern, Leerzeichen, + und /)
    const phoneRegex = /^[+0-9\s/-]{6,25}$/;
    if (!phoneRegex.test(formData.telefon.trim())) {
      setStatus({ 
        type: 'error', 
        message: 'Bitte geben Sie eine gültige Telefonnummer ein (z. B. 0699 12345678).' 
      });
      return;
    }

    // 3. Überprüfung aller Personen-Einträge (Kein Feld darf leer sein)
    for (let i = 0; i < personen.length; i++) {
      const p = personen[i];
      if (!p.vorname.trim() || !p.alter.trim() || !p.vorlieben.trim()) {
        setStatus({ 
          type: 'error', 
          message: `Bitte füllen Sie alle Angaben (Vorname, Alter, Details) für Person #${i + 1} vollständig aus.` 
        });
        return;
      }
    }

    // Wenn die Validierung erfolgreich war, wird gesendet:
    setStatus({ type: null, message: 'Die Daten werden sicher verschlüsselt übertragen...' });

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, personen }),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Ihre Anmeldung wurde erfolgreich übermittelt.' });
        setFormData({ name: '', adresse: '', telefon: '', terminTag: '', terminZeit: '', ausweichTag: '', ausweichZeit: '' });
        setPersonen([{ vorname: '', alter: '', vorlieben: '' }]);
      } else {
        throw new Error();
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Übertragung fehlgeschlagen. Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1a] antialiased selection:bg-[#8a1a1a]/10 selection:text-[#8a1a1a]">
      
      {/* Großzügiger, geschichtsträchtiger Hero-Bereich */}
      <header className="max-w-4xl mx-auto pt-36 pb-28 px-8 text-center space-y-8">
        <p className="text-xs font-medium tracking-[0.3em] text-[#b89146] uppercase">
          Nikolausverein Nofels
        </p>
        <h1 className="text-5xl md:text-7xl font-serif font-normal tracking-tight text-[#1c1b1a] leading-[1.15]">
          Der Nikolausbesuch <br />
          <span className="text-[#8a1a1a] italic font-serif">in Nofels.</span>
        </h1>
        <div className="h-[1px] w-20 bg-[#b89146]/40 mx-auto my-6" />
        <p className="text-xl md:text-2xl text-[#6b6661] font-light max-w-2xl mx-auto leading-relaxed font-serif italic">
          „Wir besuchen Sie auch in diesem Jahr, wenn Sie es wünschen.“
        </p>
      </header>

      {/* Großzügiges, klares Info-Layout (Storytelling) */}
      <section className="max-w-5xl mx-auto px-8 mb-36 grid md:grid-cols-2 gap-16 items-start">
        <div className="space-y-6">
          <h2 className="text-2xl font-serif text-[#1c1b1a] border-b border-[#1c1b1a]/10 pb-4">
            Frohbotschaft statt Drohbotschaft
          </h2>
          <p className="text-[#6b6661] text-base leading-relaxed">
            Groß sind die Erwartungen und Vorfreuden, aber auch Ängste der Kinder auf den Nikolausabend hin.
          </p>
          <p className="text-[#6b6661] text-base leading-relaxed">
            Dabei kommt dem Nikolaus neben den Eltern eine besondere Verantwortung zu. Der Heilige Nikolaus ist der Überbringer der frohen Botschaft.
          </p>
        </div>

        <div className="bg-white p-12 rounded-3xl border border-[#e8e6e1] space-y-8 shadow-sm">
          <h2 className="text-2xl font-serif text-[#1c1b1a]">Zeitlicher Rahmen</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-[#f0ede6] pb-3">
              <span className="text-[#6b6661]">Besuchstage</span>
              <span className="font-medium tracking-wide">5., 6. & 7. Dezember</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#f0ede6] pb-3">
              <span className="text-[#6b6661]">Uhrzeit</span>
              <span className="font-medium">jeweils ab 16:30 Uhr</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-[#8a1a1a] font-semibold">Anmeldeschluss</span>
              <span className="text-[#8a1a1a] font-semibold tracking-wide">Dienstag, 2. Dez, 17:00 Uhr</span>
            </div>
          </div>
          <p className="text-[11px] text-[#9c9790] leading-relaxed pt-2">
            Die freiwilligen Spenden werden ausnahmslos für soziale Fälle im Dorf verwendet.
          </p>
        </div>
      </section>

      {/* Das Anmeldeformular im weiten, puristischen Layout */}
      <section className="max-w-3xl mx-auto px-8 pb-40">
        <div className="text-center mb-20 space-y-3">
          <h2 className="text-3xl font-serif tracking-tight text-[#1c1b1a]">
            Anmeldeformular {new Date().getFullYear()}
          </h2>
          <p className="text-[#6b6661] text-sm font-light">Nach Absenden des Formulars wird ein formatiertes Dokument erstellt.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-16">
          
          {/* Sektion 1: Kontakt */}
          <div className="space-y-8">
            <h3 className="text-xs font-medium tracking-[0.2em] text-[#b89146] uppercase border-b border-[#e8e6e1] pb-2">
              01 / Kontaktdaten
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase text-[#9c9790] tracking-wider">Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Familie" className="w-full px-5 py-4 bg-white border border-[#e8e6e1] rounded-xl text-sm outline-none transition-all focus:border-[#8a1a1a] focus:ring-1 focus:ring-[#8a1a1a]" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase text-[#9c9790] tracking-wider">Telefon *</label>
                <input type="tel" name="telefon" value={formData.telefon} onChange={handleInputChange} placeholder="Für Rückfragen" className="w-full px-5 py-4 bg-white border border-[#e8e6e1] rounded-xl text-sm outline-none transition-all focus:border-[#8a1a1a] focus:ring-1 focus:ring-[#8a1a1a]" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase text-[#9c9790] tracking-wider">Adresse *</label>
              <input type="text" name="adresse" value={formData.adresse} onChange={handleInputChange} placeholder="Straße, Hausnummer, Ort" className="w-full px-5 py-4 bg-white border border-[#e8e6e1] rounded-xl text-sm outline-none transition-all focus:border-[#8a1a1a] focus:ring-1 focus:ring-[#8a1a1a]" />
            </div>
          </div>

          {/* Sektion 2: Termine */}
          <div className="space-y-8">
            <h3 className="text-xs font-medium tracking-[0.2em] text-[#b89146] uppercase border-b border-[#e8e6e1] pb-2">
              02 / Gewünschter Termin
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Hauptwunsch */}
              <div className="space-y-3 bg-white p-6 rounded-2xl border border-[#e8e6e1]">
                <span className="text-[11px] font-bold text-[#8a1a1a] uppercase tracking-wider block">Hauptwunsch *</span>
                <div className="grid grid-cols-1 gap-2">
                  <select name="terminTag" value={formData.terminTag} onChange={handleInputChange} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]">
                    <option value="">Tag wählen</option>
                    <option value="Freitag, 5.12.">Freitag, 5.12.</option>
                    <option value="Samstag, 6.12.">Samstag, 6.12.</option>
                    <option value="Sonntag, 7.12.">Sonntag, 7.12.</option>
                  </select>
                  <select name="terminZeit" value={formData.terminZeit} onChange={handleInputChange} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]">
                    <option value="">Zeitrahmen wählen</option>
                    <option value="16.30 - 18.00">16:30 - 18:00 Uhr</option>
                    <option value="18.00 - 19.30">18:00 - 19:30 Uhr</option>
                    <option value="ab 19.30 Uhr">ab 19:30 Uhr</option>
                  </select>
                </div>
              </div>

              {/* Ausweichtermin */}
              <div className="space-y-3 bg-white/50 p-6 rounded-2xl border border-[#e8e6e1]/60">
                <span className="text-[11px] font-bold text-[#6b6661] uppercase tracking-wider block">Ausweichtermin</span>
                <div className="grid grid-cols-1 gap-2">
                  <select name="ausweichTag" value={formData.ausweichTag} onChange={handleInputChange} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]">
                    <option value="">Tag wählen</option>
                    <option value="Freitag, 5.12.">Freitag, 5.12.</option>
                    <option value="Samstag, 6.12.">Samstag, 6.12.</option>
                    <option value="Sonntag, 7.12.">Sonntag, 7.12.</option>
                  </select>
                  <select name="ausweichZeit" value={formData.ausweichZeit} onChange={handleInputChange} className="w-full px-4 py-3 bg-[#faf9f6]/60 rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]">
                    <option value="">Zeitrahmen wählen</option>
                    <option value="16.30 - 18.00">16:30 - 18:00 Uhr</option>
                    <option value="18.00 - 19.30">18:00 - 19:30 Uhr</option>
                    <option value="ab 19.30 Uhr">ab 19:30 Uhr</option>
                  </select>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#9c9790] italic">Der gewünschte Termin ist fix!!! Wir werden uns bemühen, den zeitlichen Rahmen einzuhalten.</p>
          </div>

          {/* Sektion 3: Personen */}
          <div className="space-y-8">
            <div className="flex justify-between items-end border-b border-[#e8e6e1] pb-2">
              <h3 className="text-xs font-medium tracking-[0.2em] text-[#b89146] uppercase">
                03 / Personen im Haus
              </h3>
              <span className="text-[11px] text-[#9c9790] italic">Bitte unbedingt alle Anwesenden anführen (Kinder, Eltern, Verwandte)</span>
            </div>

            <div className="space-y-6">
              {personen.map((person, index) => (
                <div key={index} className="bg-white p-8 rounded-3xl border border-[#e8e6e1] space-y-6 relative transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-serif italic text-[#b89146]">Person {index + 1}</span>
                    {personen.length > 1 && (
                      <button type="button" onClick={() => removePerson(index)} className="text-xs text-[#8a1a1a] opacity-60 hover:opacity-100 transition-opacity">
                        Entfernen
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9c9790] uppercase tracking-wider">Vorname *</label>
                      <input type="text" placeholder="Lukas" value={person.vorname} onChange={(e) => handlePersonChange(index, 'vorname', e.target.value)} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9c9790] uppercase tracking-wider">Alter *</label>
                      <input type="text" placeholder="z.B. 6 Jahre" value={person.alter} onChange={(e) => handlePersonChange(index, 'alter', e.target.value)} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1]" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-[#9c9790] uppercase tracking-wider">Hobbys, Vorlieben, Interessen & Lob *</label>
                      <textarea rows={2} placeholder="Was zeichnet die Person aus? Lobenswerte Eigenschaften, Interessen..." value={person.vorlieben} onChange={(e) => handlePersonChange(index, 'vorlieben', e.target.value)} className="w-full px-4 py-3 bg-[#faf9f6] rounded-xl text-sm outline-none border border-transparent focus:border-[#e8e6e1] resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addPerson} className="w-full py-4 rounded-2xl border border-dashed border-[#e8e6e1] text-stone-500 hover:text-stone-800 hover:bg-white text-xs font-medium tracking-wider uppercase transition-all">
              + Person hinzufügen
            </button>
          </div>

          {/* Feedback & Absenden */}
          <div className="pt-8 border-t border-[#e8e6e1] space-y-6">
            {status.type && (
              <div className={`p-4 rounded-xl text-xs text-center tracking-wide font-medium border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-[#8a1a1a] border-rose-100'}`}>
                {status.message}
              </div>
            )}

            <button type="submit" className="w-full bg-[#1c1b1a] hover:bg-black text-white font-medium py-5 px-8 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all duration-200">
              Anmeldung verbindlich senden
            </button>
          </div>
        </form>
      </section>

      {/* Reduzierter, redaktioneller Footer */}
      <footer className="bg-white text-[#6b6661] py-20 px-8 text-xs border-t border-[#e8e6e1]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between gap-12 leading-relaxed">
          <div className="space-y-3">
            <p className="font-serif text-sm text-[#1c1b1a]">Nikolausteam Nofels</p>
            <p className="max-w-xs font-light">Bei Fragen oder Unklarheiten zur Einteilung stehen wir Ihnen gerne telefonisch zur Seite.</p>
          </div>
          <div className="space-y-2 font-light">
            <p className="text-[#1c1b1a] font-medium">Ansprechpartner bei Fragen:</p>
            <p>Helene Müller: <span className="text-[#1c1b1a]">0699 122 755 64</span></p>
            <p>Barbara Stieger: <span className="text-[#1c1b1a]">0699 10 44 44 90</span></p>
            <p className="pt-2">E-Mail: <a href="mailto:nikolaus.nofels@outlook.com" className="text-[#8a1a1a] hover:underline font-medium">nikolaus.nofels@outlook.com</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}