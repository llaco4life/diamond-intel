## Make Diamond Intel installable (Add to Home Screen)

Adds a web app manifest and proper icons so coaches and players can tap
"Add to Home Screen" on iOS/Android and launch Diamond Intel like a native
app — fullscreen, with its own icon, no browser chrome.

**No service worker, no offline mode, no `vite-plugin-pwa`.** This avoids
all the preview/caching headaches while delivering the "feels like an app"
experience.

### What gets added

1. **`public/manifest.webmanifest`** — declares the app name, icons,
   theme color (brand green `#1D9E75`), background color, and
   `display: "standalone"` so it launches without browser chrome.

2. **App icons in `public/icons/`** — generated from the existing Logo:
   - `icon-192.png` (Android home screen)
   - `icon-512.png` (Android splash / app switcher)
   - `icon-maskable-512.png` (Android adaptive icon, safe-zone padded)
   - `apple-touch-icon.png` 180×180 (iOS home screen)

3. **`src/routes/__root.tsx`** — add three head links/meta tags:
   - `<link rel="manifest" href="/manifest.webmanifest">`
   - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
   - `<meta name="theme-color" content="#1D9E75">` (status bar tint on Android Chrome)
   - `<meta name="apple-mobile-web-app-capable" content="yes">` and `apple-mobile-web-app-status-bar-style` for iOS standalone mode

### What this gets you

- **iOS**: Safari → Share → Add to Home Screen → launches fullscreen
  with the Diamond Intel icon and name.
- **Android**: Chrome shows an "Install app" prompt automatically; once
  installed it appears in the app drawer and launches standalone.
- **Desktop Chrome/Edge**: Install icon in the address bar.

### What this does NOT do

- No offline support (the app still requires internet).
- No background sync, push notifications, or service worker caching.
- No `vite-plugin-pwa` dependency added.

If offline support is ever needed later, we can layer a full PWA on top —
but most softball coaches at the field have at least cellular signal, so
the simple route is the right call now.

### Files changed

- **Add** `public/manifest.webmanifest`
- **Add** `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- **Edit** `src/routes/__root.tsx` (add manifest link, apple-touch-icon, theme-color, iOS meta tags)

No new dependencies. No code changes outside the root route.
