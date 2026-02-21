# VocaLearn – Deployment-Anleitung

## Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 18 oder neuer) – einmalig installieren
- Ein kostenloses Konto bei [GitHub](https://github.com) 
- Ein kostenloses Konto bei [Vercel](https://vercel.com)
- Deinen Anthropic API-Key (unter https://console.anthropic.com/)

---

## Schritt 1: Projekt lokal einrichten

Terminal öffnen und folgende Befehle ausführen:

```bash
# In den Projektordner wechseln
cd vocalearn

# Abhängigkeiten installieren
npm install

# .env-Datei anlegen (aus dem Beispiel)
cp .env.example .env
```

Dann die `.env`-Datei öffnen und den echten API-Key eintragen:
```
ANTHROPIC_API_KEY=sk-ant-dein-echter-key
```

Lokalen Entwicklungsserver starten:
```bash
npm run dev
```
→ App läuft unter http://localhost:5173

---

## Schritt 2: Auf GitHub hochladen

1. Auf https://github.com/new ein neues Repository anlegen (z. B. `vocalearn`)
2. Dann im Terminal:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/vocalearn.git
git push -u origin main
```

---

## Schritt 3: Bei Vercel deployen

1. Auf https://vercel.com/new einloggen (mit GitHub-Account)
2. Das Repository `vocalearn` auswählen → **Import**
3. Framework wird automatisch als **Vite** erkannt
4. Unter **Environment Variables** den API-Key eintragen:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-dein-echter-key`
5. **Deploy** klicken

Nach ca. 1–2 Minuten ist die App live unter einer URL wie:
`https://vocalearn-xyz.vercel.app`

---

## Schritt 4: Ausgabenlimit bei Anthropic setzen (wichtig!)

Damit keine unerwarteten Kosten entstehen:

1. https://console.anthropic.com/ öffnen
2. → **Settings** → **Limits**
3. Monatliches Ausgabenlimit setzen (z. B. 5 €)
4. Benachrichtigungs-Schwellwert setzen (z. B. bei 80%)

---

## Sicherheitsarchitektur

```
Browser (Nutzer)
      │
      │  POST /api/analyze  (nur Bilddaten, kein API-Key)
      ▼
Vercel Serverless Function  ← ANTHROPIC_API_KEY (nur hier, serverseitig)
      │
      │  POST https://api.anthropic.com/v1/messages
      ▼
Anthropic API
      │
      │  Vokabeln als JSON
      ▼
Vercel Serverless Function
      │
      │  { vocab: [...] }
      ▼
Browser (Nutzer)
```

Der API-Key verlässt **niemals** den Vercel-Server. Nutzer sehen nur `/api/analyze`.

---

## Rate-Limiting

Die Serverless Function erlaubt aktuell **20 KI-Anfragen pro IP-Adresse pro Stunde**.

Um das zu ändern, in `api/analyze.js` folgende Werte anpassen:
```js
const WINDOW_MS = 60 * 60 * 1000; // Zeitfenster: 1 Stunde
const MAX_REQUESTS = 20;           // Max. Anfragen pro Fenster
```

---

## Updates deployen

Nach Änderungen am Code einfach:
```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```
Vercel erkennt den Push automatisch und deployed die neue Version.

---

## Datenschutzhinweis

Fotos, die Nutzer hochladen, werden an die Anthropic API gesendet und dort verarbeitet. 
Für den schulischen Einsatz ggf. die Anthropic-Datenschutzerklärung prüfen und Nutzer 
informieren. Bilder werden von Anthropic nicht dauerhaft gespeichert (Stand: 2025).
