# Android mobile app (Expo)

This repo now includes an Expo React Native Android app in `mobile/`.

## Architecture (why WebView)

The web game uses **React Three Fiber + Rapier (WASM physics)**. That stack is not yet reliably
portable to pure native Expo GL on current Expo SDKs without rewriting physics.

So the Android app is a native Expo shell that:

1. Lets you enter your PC LAN address
2. Opens the existing WebGL game in a full-screen **WebView**
3. Keeps multiplayer working over the same Vite `/ws` proxy

Same game code, playable on your phone.

**Production game URL:** https://box-balance-ws.onrender.com/

The Android app defaults to that host for **Play online**. LAN/custom URL is optional for local
dev.

Note: Render free tier may sleep — first load can take ~30s.

---

## Step-by-step: test on your Android phone

### 0) Prerequisites

- Android phone and PC on the **same Wi‑Fi**
- Node.js installed on the PC (you already have this)
- Phone: install **Expo Go** from the Play Store  
  https://play.google.com/store/apps/details?id=host.exp.exponent

### 1) Find your PC Wi‑Fi IP

On Linux:

```bash
hostname -I | awk '{print $1}'
```

Or:

```bash
ip -4 addr show | grep inet
```

Example result: `192.168.1.42`  
You will use: `192.168.1.42:5173`

### 2) Start the game on the PC (LAN mode)

From the repo root (`box_balance`):

```bash
# Terminal A — web game reachable on Wi‑Fi + multiplayer websocket
npm run dev:all:lan
```

You should see Vite print a **Network** URL like:

```text
➜  Network: http://192.168.1.42:5173/
```

Leave this running.

### 3) Start the Expo mobile app

New terminal:

```bash
cd mobile
npm start
```

This uses **LAN mode** (recommended). A QR code appears in the terminal.

> Prefer LAN over tunnel when phone and PC share Wi‑Fi. Tunnel needs `@expo/ngrok` and is slower.

### 3b) If Expo QR / connection fails — use tunnel

```bash
cd mobile
npm install --save-dev @expo/ngrok@^4.1.0
npm run start:tunnel
```

If Expo asks to install `@expo/ngrok` globally, type **`Y`** and Enter.

### 3c) Chrome-sandbox / React Native DevTools error (Linux)

You may see:

```text
The SUID sandbox helper binary was found, but is not configured correctly
... chrome-sandbox is owned by root and has mode 4755
```

That only breaks the optional DevTools window — Metro can still run. Fix it once in a normal terminal:

```bash
find ~/.cache/dotslash -name chrome-sandbox -print0 | xargs -0 -I{} sudo sh -c 'chown root:root "{}" && chmod 4755 "{}"'
```

Or ignore it and continue — press Enter after answering the ngrok prompt; Expo usually keeps bundling.

To avoid DevTools sandbox noise:

```bash
ELECTRON_DISABLE_SANDBOX=1 npm start
```

### 4) Open on the phone

1. Open **Expo Go**
2. Scan the QR code (same Wi‑Fi)
3. App opens to the **Nizhen catch** setup screen
4. Enter your PC address, e.g. `192.168.1.42:5173`
5. Tap **Play**
6. The game loads in the WebView

Use **← Exit** (top-left) to return to the setup screen.

### 5) Quick checks

| Check | Expected |
| --- | --- |
| Solo play | Board tilts with touch, ball rolls |
| Jump / power-ups | Bottom mobile action bar works |
| Co-op / versus | Create room on phone or PC; join with room code |
| Disconnect | If Vite stops, Play shows a load error |

---

## Common issues

### “Could not load the game”

- PC firewall may block port **5173** / **3001**
- Phone is on mobile data / different Wi‑Fi
- Wrong IP (use Wi‑Fi IP, not `127.0.0.1`)

Allow ports temporarily (Ubuntu example):

```bash
sudo ufw allow 5173/tcp
sudo ufw allow 3001/tcp
```

### Expo Go cannot connect to Metro

- Phone and PC must share Wi‑Fi
- Or use tunnel mode:

```bash
cd mobile
npx expo start --tunnel
```

### WebView is blank / WebGL fails

- Some very old Android GPUs struggle with WebGL2
- Try Chrome on the phone first: open `http://YOUR_IP:5173` directly  
  If Chrome works, Expo WebView should too

---

## Useful scripts (repo root)

| Script | Purpose |
| --- | --- |
| `npm run dev:lan` | Vite on all interfaces (`0.0.0.0:5173`) |
| `npm run server` | Multiplayer websocket (`:3001`) |
| `npm run dev:all:lan` | Both (recommended for phone testing) |
| `npm run mobile` | Start Expo |
| `npm run mobile:android` | Start Expo targeting Android |

---

## Later: installable APK (optional)

When you want a Play-Store-style installable build (not Expo Go):

```bash
cd mobile
npx expo install expo-dev-client
npx expo prebuild
npx expo run:android
```

That requires Android Studio / SDK on the PC.

---

## What’s in `mobile/`

- `App.js` — native setup screen + WebView game shell
- `app.json` — Android package `com.nizhencatch.app`, cleartext HTTP enabled for LAN
- Expo SDK **54** (Play Store Expo Go compatible; see `mobile/AGENTS.md`)
