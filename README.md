# Tillie

**See it. Style it. Make it yours.**

Spot an outfit in a video or screenshot. Tillie uses Gemini to find the pieces, compares similar items across retailers within your budget, and lets you mix them on a personalized avatar before you buy the whole look. Built for DubHacks '26, Style Community Marketplace track.

**Demo journey:** Discover a look → select a top → compare options → try it in the Studio → shuffle an outfit → save it → add pieces to the bag → review checkout.

## Features

| Screen | What it does |
| --- | --- |
| Welcome | Logo, tagline, start fresh or explore with a sample profile |
| Discover | Sample vertical video with **Shop this look**, screenshot upload (real Gemini), video link (simulated) |
| Shop sheet | Checklist of detected pieces → compare similar items with budget, size, color filters and price sort → product details (colors, sizes, add to studio, save item, add to bag, view retailer) |
| Studio | Layered avatar, left layer strip with ▲▼ layer order (outerwear over/under the top), ‹ › to cycle pieces, lock pieces, **Shuffle outfit**, total price, save, add to bag |
| Saved | Outfit cards with avatar thumbnail, rename, delete, open in Studio, checkout whole outfit, post to Community |
| Community | Two-column feed, like/dislike, **Try this look**, creator points (concept) |
| Bag + Checkout | Checkboxes, quantity, remove, live subtotal → checkout grouped by retailer → sample confirmation |
| Profile | Name, size, style, budget, address, measurements in cm/in that reshape the avatar |

Bag, saved outfits, studio, community posts and profile are saved on the phone.

## Responsible AI and trust

- Gemini only sees screenshots the user chooses to upload. Tillie never reads or monitors other apps.
- Simulated detection and sample prices are clearly labeled in the app.
- No payment details are collected. Checkout is simulated and hands off to each retailer.
- The avatar is an illustrative preview. Measurements don't guarantee fit.
- The Gemini key stays on the server, never in the app or on GitHub.

## Project structure

```
outfit-app/
  app/                         ← phone app (Expo / React Native)
    App.js                     ← bottom navigation + bag
    src/config.js              ← ⚠ put the server laptop's IP here
    src/theme.js               ← colors and shared helpers (restyle here)
    src/store.js               ← all app data + saving on the phone
    src/api.js                 ← talks to the server (with demo fallback)
    src/screens/               ← Welcome, Discover, Studio, Saved, Community, Profile
    src/components/            ← BodySim (avatar), ShopSheet, BagSheet, ui
    src/data/                  ← sample products + seed outfits
  server/                      ← Node server that calls Gemini
    index.js                   ← POST /detect, GET /similar
    products.json              ← 22 sample products across 5 categories
    .env.example               ← copy to .env and paste your Gemini key
```

## Run it

You need **Node.js (LTS)**, **VS Code**, and the **Expo Go** app on your phone.

### 1. Start the server

```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Paste your key from Google AI Studio after `GEMINI_API_KEY=` in `server/.env`, then:

```bash
npm start
```

Open http://localhost:3000 in a browser. You should see `"ok": true`.

### 2. Point the app at the server

Find the server laptop's local IP (Mac: System Settings → Wi-Fi → Details. Windows: `ipconfig`, "IPv4 Address").
In `app/src/config.js`:

```js
export const SERVER_URL = "http://YOUR-IP:3000";
```

Phone and laptop must be on the **same Wi-Fi**.

### 3. Start the app

```bash
cd app
npm install
npx expo start
```

Scan the QR code with your phone camera (iPhone) or Expo Go (Android). Tap **Explore with a sample profile** for a demo that's ready to go.

## If something breaks

| Problem | Fix |
| --- | --- |
| "Couldn't reach the AI server" banner | Phone can't reach the server. Check `SERVER_URL`, same Wi-Fi, server running. Campus Wi-Fi often blocks this, so use a phone hotspot. |
| Server says "Could not load the default credentials" | `GEMINI_API_KEY` is missing in `server/.env` |
| Gemini error about the model | Set `GEMINI_MODEL=` in `.env` to a current model from https://ai.google.dev/gemini-api/docs/image-understanding |
| Expo complains about package versions | Run `npx expo install --fix` inside `app/` |
| QR code won't connect | Run `npx expo start --tunnel` |
| Want a clean demo | Profile → Reset demo data |

## Built with

Expo (React Native) · AsyncStorage · Node + Express · Google Gemini API (`@google/genai`)

## Future work

Share-sheet extension for any app · real retailer search APIs · cross-border availability · friend polls ("Should I buy this?") · real creator commission · AI virtual try-on.
