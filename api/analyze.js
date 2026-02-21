// api/analyze.js
// Vercel Serverless Function – läuft serverseitig, API-Key nie im Browser sichtbar

// Einfaches In-Memory Rate-Limiting (wird bei jedem Kaltstart zurückgesetzt)
// Für produktiven Einsatz: Upstash Redis oder Vercel KV verwenden
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 Stunde
const MAX_REQUESTS = 20;           // max. 20 KI-Analysen pro IP pro Stunde

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  // Fenster zurücksetzen wenn abgelaufen
  if (now - entry.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) return true;

  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return false;
}

export default async function handler(req, res) {
  // Nur POST erlaubt
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // IP-Adresse des Nutzers ermitteln
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // Rate-Limit prüfen
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Zu viele Anfragen. Bitte warte eine Stunde und versuche es erneut.",
    });
  }

  // API-Key aus Umgebungsvariable (nur serverseitig verfügbar)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API-Key nicht konfiguriert." });
  }

  // Request-Body validieren
  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: "Bild-Daten fehlen." });
  }

  // Erlaubte Bildformate prüfen
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(mediaType)) {
    return res.status(400).json({ error: "Ungültiges Bildformat." });
  }

  // Anfrage an Anthropic weiterleiten
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: `This is a page from an English learning book. Extract ALL English vocabulary words. For each, provide the German translation and a relevant emoji. Respond ONLY with a JSON array: [{"english":"...","german":"...","emoji":"..."}]`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error("Anthropic error:", err);
      return res.status(502).json({ error: "KI-Anfrage fehlgeschlagen." });
    }

    const data = await anthropicRes.json();
    const text = data.content.map((b) => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const vocab = JSON.parse(clean);

    return res.status(200).json({ vocab });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Interner Fehler." });
  }
}
