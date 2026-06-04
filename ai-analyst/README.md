# AI Analyst — Site complet

Landing page premium pentru **AI Analyst** — analiză automată de documente, conversații și PDF-uri (rezumate, rapoarte, FAQ).

## Pornire rapidă (Windows)

**Dublu-click:** `PORNESTE-SITE.bat`  
sau în PowerShell:

```powershell
cd ai-analyst
.\start.ps1
```

Se deschide **http://localhost:8080** (necesar pentru chat-ul AI).

## Structură

| Fișier | Rol |
|--------|-----|
| `index.html` | Pagina principală (toate secțiunile) |
| `privacy.html` / `terms.html` | Pagini legale RO/RU/EN |
| `css/styles.css` | Design dark premium |
| `js/i18n.js` | Traduceri complete |
| `js/app.js` | Demo, prețuri, formular |
| `js/chat.js` | Asistent AI pentru clienți |
| `js/config.js` | Setări API chat |

## Conținut (din sarcina tehnică)

- Hero + mesaj principal
- Vizual Input → AI → Output
- Problemă · Soluție · Cum funcționează
- 6 funcționalități · Demo interactiv (5.000 mesaje)
- Public țintă · Beneficii
- **Prețuri:** Gratuit 0 · Start 149 · Pro 349 · Business 699 MDL/lună
- **Contact:** 060 833 229 · meroowiiwii@gmail.com · str. Decebal 6, Chișinău
- Testimoniale · Statistici · CTA · Footer
- **RO | RU | EN** (limba salvată în browser)
- Formular „Încearcă acum” + **chat AI** 💬

## Deploy

Încarcă folderul `ai-analyst/` pe Netlify, Vercel, GitHub Pages sau orice hosting static.

## Notă chat AI

Cheia API e în `js/config.js`. Pentru producție, mută apelurile pe un backend propriu (nu expune cheia în frontend).
