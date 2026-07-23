# Wolf ERP — Windows Desktop

A **standalone** desktop build of Wolf ERP. This folder contains everything needed
to produce the Windows installers — it does not read from `../client`, so it can be
copied or moved anywhere and still build.

Produces two installers:

| File | Type | Use |
| --- | --- | --- |
| `Wolf ERP_1.0.0_x64-setup.exe` | NSIS | Normal download-and-run installer |
| `Wolf ERP_1.0.0_x64_en-US.msi` | WiX / MSI | Group Policy & SCCM deployment |

Both are **installers**, not portable executables: running one launches a setup
wizard, lets you choose the install directory, and creates a Desktop shortcut and
Start Menu entry. Nothing is written until you click Install, and the app is
removable from Add/Remove Programs.

Once installed, nobody needs to reinstall again. The interface is loaded from the
deployed website, so a `git push` reaches every desktop app; the shell keeps
itself updated through a signed release channel; and the app still opens and shows
your latest data with no internet. See [How updates reach installed
apps](#how-updates-reach-installed-apps) and [Working offline](#working-offline).

---

## Tech stack

### Desktop shell
| Layer | Choice | Why |
| --- | --- | --- |
| Shell | **Tauri 2** (Rust) | Uses the OS's built-in WebView2 instead of shipping a browser. The installers come out ~8–12 MB where Electron would be ~150 MB. |
| Runtime | **Microsoft Edge WebView2** | Pre-installed on Windows 10 2004+ and Windows 11; the bundler pulls it in on older machines. |
| Native code | **Rust** (edition 2021) | `src-tauri/src/lib.rs` — window creation, live-vs-bundled UI, offline cache, session store, external-link routing. |
| Updates | **`tauri-plugin-updater`** + minisign | Signed, verified against a key compiled into the app. |
| Offline store | Plain JSON under `%APPDATA%` | No embedded database. One file per cached request; the whole thing is disposable and rebuilt by normal use. |
| Installer (EXE) | **NSIS** | Custom install path, Desktop + Start Menu shortcuts, per-user or per-machine. |
| Installer (MSI) | **WiX Toolset v3** | The format Windows admins deploy with. |
| Build tool | **`cargo tauri`** (Rust CLI) | Deliberately not the npm CLI — see [Toolchain notes](#toolchain-notes). |

### Application (bundled inside the shell)
| Layer | Choice |
| --- | --- |
| Framework | **Next.js 15** (App Router), static export (`output: "export"`) |
| UI | **React 18**, **Tailwind CSS 3** with semantic design tokens |
| Charts | **Recharts 2** |
| Icons | **lucide-react** |
| Exports | **ExcelJS** (.xlsx), **jsPDF + autoTable** (.pdf) |
| State | React Context + a stale-while-revalidate fetch cache (`useFetch`) |

### Backend (shared with the website — not built here)
| Layer | Choice |
| --- | --- |
| API | **Node.js + Express** |
| Database | **MongoDB / Mongoose** |
| Auth | **JWT** (15-day expiry) |
| AI | **Google Gemini**, **Groq** (optional) |
| Hosting | **Render** (API) · **Vercel** (web app) |

---

## How the desktop app and website stay connected

They are two front-ends over **one backend**. Sign up on the website, sign in on
the desktop app, and it is the same account, workspace, and data — there is no
separate desktop database and nothing to sync.

```
   Desktop app (this folder)  ─┐
                               ├─→  wolf-erp-api.onrender.com  ─→  MongoDB Atlas
   Website (wolf-erp.vercel.app) ─┘
```

Because the desktop build is a *static* export, the server address cannot be baked
in at compile time or every customer would be stuck with one server. It is resolved
at runtime, most specific first:

1. `window.__WOLF_API_URL__` — injected by the Rust shell before any page script runs
2. `localStorage["wolf_api_url"]` — per-machine override
3. `NEXT_PUBLIC_API_URL` — build-time value (used by the web deployment)
4. `https://wolf-erp-api.onrender.com/api` — default, so a fresh install just works

Change it in-app at **Settings → Desktop app → Backend server**. It is stored in
`%APPDATA%\com.wolferp.desktop\settings.json` and applied on next launch. That is
how you point the same installer at a self-hosted server or `http://localhost:5000/api`.

### Why API calls go through Rust

The desktop app issues its API requests from the **Rust process**, not the webview
(`tauri-plugin-http`, wired up in `src/lib/api.js` → `transport()`).

This matters because a webview still enforces browser CORS. Tauri's origin is
`http://tauri.localhost`, which the API's allow-list doesn't contain, so every
request died at the preflight and surfaced as *"Couldn't reach the server"* —
even though the server was up and healthy. Proof:

```bash
# From the website's origin — allowed
curl -i -X OPTIONS .../api/auth/login -H "Origin: https://wolf-erp.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# → access-control-allow-origin: https://wolf-erp.vercel.app

# From the desktop's origin — no allow-origin header at all, so the webview blocks it
curl -i -X OPTIONS .../api/auth/login -H "Origin: http://tauri.localhost" \
  -H "Access-Control-Request-Method: POST"
# → (no access-control-allow-origin)
```

Going through Rust removes the browser origin entirely, so there is no preflight
and no CORS — the packaged app reaches the same server the website uses with no
server-side change required. In a browser, `transport()` resolves to the native
`fetch` and nothing about the web build changes.

`server/src/app.js` *also* now allow-lists `http://tauri.localhost` and
`tauri://localhost`. That's belt-and-braces: it isn't needed for this transport,
but it keeps a future webview-based build working.

Outbound hosts are scoped in `src-tauri/capabilities/default.json` to `https://*`
plus localhost — deliberately broad on HTTPS because the server address is
user-configurable, but no arbitrary plain-HTTP destinations.

External links (the web version, vendor sites) open in the system browser rather
than inside the app frame, which has no address bar or back button.

---

## How updates reach installed apps

Nobody has to uninstall and reinstall. There are two paths, and which one you need
depends only on **what** you changed.

| You changed | How it ships | Turnaround |
| --- | --- | --- |
| Pages, components, styling, API calls — anything under `client/src` | `git push` → Vercel deploys → the app picks it up next launch | Seconds. No desktop build at all. |
| The Rust shell — `src-tauri/`, native commands, window behaviour | `npm run release` → signed release on GitHub → app self-updates on launch | One build, then automatic. |

In practice almost everything is the first row.

### The interface comes from the website

On launch the shell checks whether `wolf-erp.vercel.app` is reachable. If it is,
the window loads **the live site** rather than the files inside the installer.
So the desktop app runs whatever you last deployed — the same build the website
serves, which is exactly why there is nothing to keep in step.

```
                    ┌─ reachable ──→ https://wolf-erp.vercel.app/desktop  (live)
   launch ──→ probe ─┤
                    └─ not reachable → app/out/index.html                (fallback)
```

Note the entry point is **`/desktop`**, not `/`. On the live site `/` is the
marketing landing page, and it is server-rendered — so its HTML would paint
before any client-side code could redirect away, giving a visible flash of the
landing page every launch. `/desktop` (`client/src/app/desktop/page.jsx`) is the
animated splash that hands over to sign-in, or straight to the workspace if a
session survived. The bundled fallback's `/` is the same screen.

Two consequences worth internalising:

- **Desktop-only features belong in `client/`, not in `desktop/app/`.** When
  online the app *is* the web build, so anything living only in `desktop/app/`
  is invisible except when offline. `DesktopStatus.jsx` and `DesktopSettings.jsx`
  both sit in `client/` and render `null` in a browser. `desktop/app/` is a
  synced copy, not a place to author.
- The deployed site is now part of the app's trust boundary. It is granted IPC
  (`capabilities/remote.json`) so it can reach the offline cache and session
  store — but deliberately **not** the Rust HTTP client, so a compromise of the
  site can't turn the desktop app into a CORS-ignoring proxy.

Users can pin themselves to the installed version at **Settings → Desktop app →
Always use the latest version**, which is the escape hatch if a deploy ever goes
bad.

> **Deploy the website before handing out this build.** The shell opens
> `/desktop`, which only exists once `client/` is deployed. It won't strand
> anyone — the startup check requires a success response, not just a reachable
> host, so a missing or half-deployed site falls back to the bundled UI rather
> than parking the window on a 404 with no address bar. But the first launch
> would silently be the offline copy, which is not what you want on day one.

### The shell updates itself

`tauri-plugin-updater` checks a signed manifest on every launch, downloads a
newer build in the background, and installs it. The user sees a "restart to
finish" bar; if they ignore it, it applies on the next launch anyway.

```bash
npm run release 1.1.0     # bump, build, sign, publish to GitHub Releases
npm run release --dry-run # build + write dist/latest.json, upload nothing
```

Updates are verified against a **pinned public key** in `tauri.conf.json`. The
private half lives at `~/.tauri/wolf-erp-updater.key` and is **not in the repo**.

> Back that key up. Lose it and no installed copy can ever be updated again —
> every existing user would need a manual reinstall to get onto a new key.

---

## Working offline

The app opens and stays usable with no connection, showing the data as it was
when you were last online.

Every successful read is mirrored to disk by the Rust shell:

```
%APPDATA%\com.wolferp.desktop\backup\      one JSON file per request
```

When a request can't reach the server, that snapshot is served instead of an
error, and a bar appears reading *"Offline. Showing your data as it was 2 hours
ago."* You can browse everything you had already viewed.

**Offline is read-only.** Writes fail with a clear message rather than being
queued. That's a deliberate choice: a purchase order approved offline and
replayed six hours later — against a budget that has since moved, or a PO
somebody else already cancelled — is worse than an honest refusal at the time.

Some details that matter:

- **The snapshot is wiped on sign-out**, along with the stored session. Otherwise
  the next person to use the machine could pull the network cable and read the
  previous user's data.
- **The session lives in Rust, not `localStorage`.** The live site and the
  bundled fallback are different origins with separate storage, so a token kept
  in the browser would vanish the moment the app switched between them. It's
  written to `%APPDATA%\com.wolferp.desktop\session.json` — and only when
  "remember me" was ticked, since a session-only login must not outlive the
  process.
- Manage it at **Settings → Desktop app → Offline copy of your data**, which
  shows the size, the folder, when it last updated, and a Clear button.

---

## Layout

```
desktop/
├── app/                     Offline fallback UI — generated by scripts/sync-ui.js
│   ├── src/                 Synced from ../client/src (do not author here)
│   ├── public/              Synced from ../client/public
│   └── out/                 Static export → bundled into the installer
├── assets/                  Source logos (1024px)
├── dist/                    Installers + latest.json, ready to publish
├── scripts/
│   ├── make-icons.js        Generates the .ico, PNG set and installer artwork
│   ├── sync-ui.js           Copies the web client into app/
│   ├── build.js             Release build: path remapping + update signing
│   ├── release.js           Build, sign, write latest.json, publish to GitHub
│   └── audit-bundle.js      Fails on source maps, dev paths, weakened hardening
└── src-tauri/
    ├── src/lib.rs           Shell: window, live-vs-bundled UI, cache, updater
    ├── src/main.rs          Entry point
    ├── icons/               Generated — icon.ico + PNG set
    ├── installer/           Generated — NSIS header.bmp / sidebar.bmp
    ├── capabilities/
    │   ├── default.json     Locally-served content
    │   └── remote.json      What the live website is allowed to call
    └── tauri.conf.json      Bundle, installer, CSP and updater configuration
```

---

## Build

```bash
cd desktop
npm install                 # installs app dependencies
node scripts/make-icons.js  # regenerate icons (only if the logo changed)
npm run build:all           # sync → export → compile → both installers
npm run audit:bundle        # verify nothing leaked or regressed
```

`npm run build:all` goes through `scripts/build.js`, which remaps build paths out
of the binary and signs the update artifact. Calling `cargo tauri build` directly
still works but skips both, so use it only for local smoke tests.

To publish so that installed copies update themselves:

```bash
npm run release 1.1.0       # bump, build, sign, upload to GitHub Releases
```

Output lands in:

```
desktop/src-tauri/target/release/bundle/
├── nsis/Wolf ERP_1.0.0_x64-setup.exe
└── msi/Wolf ERP_1.0.0_x64_en-US.msi
```

One installer only:

```bash
cargo tauri build --bundles nsis   # .exe
cargo tauri build --bundles msi    # .msi
```

Live development (hot reload against the dev server):

```bash
cd app && npm run dev      # terminal 1 — localhost:3000
cargo tauri dev            # terminal 2
```

### Requirements
- **Rust** (stable, MSVC toolchain) — `rustup default stable-x86_64-pc-windows-msvc`
- **Visual Studio 2022 Build Tools** with the C++ workload
- **Node.js 18+**
- WiX and NSIS are downloaded automatically by the Tauri CLI on first build

---

## Toolchain notes

**Use the Rust CLI (`cargo tauri`), not `npx tauri`.** The npm package ships a
prebuilt `.node` native binding, which Windows **Smart App Control** blocks
(`Application Control policy has blocked this file`). The Rust CLI compiles on the
machine and avoids that class of problem.

Smart App Control also blocks locally-compiled unsigned binaries while it is
enforced. Check its state with:

```powershell
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' `
  -Name VerifiedAndReputablePolicyState).VerifiedAndReputablePolicyState
# 0 = Off   1 = Enforced   2 = Evaluation
```

⚠️ **Smart App Control cannot be re-enabled once turned off** — Windows requires a
reinstall. If you'd rather not disable it permanently, build in CI on a
`windows-latest` runner instead; the artifacts are identical.

---

## Security

Run `npm run audit:bundle` after any build. It fails the build if a source map,
a developer path, a credential, or a loosened hardening flag slips in.

### What's enforced

| Control | Setting | Why |
| --- | --- | --- |
| **CSP** | `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'` | The webview can't load remote script, embed frames, or be embedded. |
| **`connect-src`** | `'self' ipc: http://ipc.localhost` | The strongest control here. All API traffic goes through Rust IPC, so the webview needs *no* outbound network permission — an XSS has nowhere to send stolen data. |
| **`withGlobalTauri`** | `false` | `window.__TAURI__` is not exposed. Injected script has no handle on the native commands; the app imports the API as a module instead. |
| **HTTP scope** | `https://*`, localhost only | Capability-scoped in `capabilities/default.json`. Plain HTTP to arbitrary hosts is refused. The wildcard on HTTPS is deliberate — the server address is user-configurable for self-hosting. |
| **External links** | Opened in the system browser | `on_navigation` in `lib.rs` refuses to navigate the app frame anywhere outside the bundle. |
| **Source maps** | Off (`productionBrowserSourceMaps: false`) | A shipped `.map` reconstructs your original, commented source verbatim. |
| **Build paths** | Remapped via `scripts/build.js` | Rust bakes absolute paths into panic metadata. Before this, the binary contained the building user's Windows username **443 times**; now zero. |
| **Symbols** | `strip = true`, `panic = "abort"` | No symbol table, no unwind tables. |
| **DevTools** | Disabled in release | Tauri's default; there is no inspector in the shipped app. |
| **Update signing** | Pinned minisign public key | The app refuses any update it can't verify against the key compiled into it, so a hijacked release URL or a spoofed GitHub asset still cannot push code to users. |
| **Remote IPC scope** | `capabilities/remote.json`, exact origin, no HTTP client | Only `https://wolf-erp.vercel.app` may call into Rust, and it is denied `http:` permissions — so a compromise of the site can't use the desktop app as a CORS-ignoring proxy onto the user's network. |

Note the CSP applies to the **bundled fallback**, which is served over Tauri's
asset protocol. When the window is showing the live site, that page is governed
by the headers Vercel sends — so the web deployment's own CSP is now part of the
desktop app's security posture, not just the website's.

### About protecting the frontend code

Being straight with you: **you cannot fully protect code that ships to a user's
machine.** Tauri embeds the frontend assets in the binary, and anyone determined
can extract them. What the measures above actually buy you:

- **No source maps** — this is the one that matters. With maps, your original
  formatting, comments and variable names are recoverable in seconds. Without
  them, what's extractable is the minified production bundle.
- **Minified + tree-shaken** by the Next production build — readable with effort,
  but not your source.

If you want more, JS obfuscation is available, but treat it as a speed bump, not
a control: it inflates the bundle, complicates debugging real crashes, and is
undone by readily available deobfuscators. It is not worth the cost for a
line-of-business ERP.

**The durable answer is architectural, and you already have it:** the valuable
logic — pricing, approval thresholds, spend rollups, AI prompts, database access
— lives on the server. The client is a rendering layer. The audit confirms no API
keys, connection strings or JWTs are baked into the bundle; keep it that way and
extracting the frontend gains an attacker nothing they couldn't see in DevTools
on the website.

### Known gaps

1. **The installers are unsigned.** SmartScreen will warn on first run, and
   nothing proves the binary came from you. This is the single biggest remaining
   item — see below. Note this is separate from *update* signing, which **is**
   in place: updates are verified against a pinned minisign key, so the update
   channel can't be used to push code even though the installer is unsigned.
2. **The session is stored in plaintext** at
   `%APPDATA%\com.wolferp.desktop\session.json`. Windows ACLs it to the user
   account — the same protection the browser profile would give it — but an
   OS-keychain-backed store (`tauri-plugin-stronghold`, or DPAPI) would be
   stronger. It had to leave `localStorage` because the live and bundled UIs are
   separate origins.
3. **The offline snapshot is unencrypted JSON** in the same directory. It is
   cleared on sign-out, so it only ever holds the current user's data, but
   anyone with read access to that Windows account can read it.
4. **The deployed website is inside the trust boundary.** An XSS on
   `wolf-erp.vercel.app` reaches the desktop app's IPC. It is denied the Rust
   HTTP client to limit the blast radius, but the site's own security is now
   also the desktop app's security.

### Code signing
The installers are unsigned, so SmartScreen shows "Windows protected your PC" on
first run (More info → Run anyway). To sign, add to `tauri.conf.json`:

```json
"windows": {
  "certificateThumbprint": "YOUR_THUMBPRINT",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

An OV/EV code-signing certificate is what removes the warning for end users.

---

## Keeping the copy in sync

`app/` is the offline fallback — a snapshot of `../client`. **It is generated, not
authored.** Edit the web client and run:

```bash
npm run sync      # or just build; export runs it for you
```

`scripts/sync-ui.js` copies `src/` and `public/`, prunes anything deleted upstream,
keeps `dependencies` aligned, and leaves the handful of genuinely desktop-specific
files alone. Nothing here needs doing by hand any more.

If `../client` isn't present the step is skipped and the build uses the copy
already in `app/` — this folder stays independently buildable.

**Desktop-only features do not go here.** When online the app loads the deployed
website, so code that exists only in `app/` is invisible except offline. Put it in
`client/` and have it no-op in a browser, the way `DesktopStatus.jsx` and
`DesktopSettings.jsx` do.

### What the sync deliberately does not touch

| Path | Why |
| --- | --- |
| `next.config.js` | Always `output: "export"`; the web copy keeps SSR. |
| The seven `[id]/page.jsx` routes | Each returns one placeholder param. Next 15 refuses to export a dynamic route with an empty `generateStaticParams()`. Real ids never hard-load — the app boots at `index.html` and client-routes, reading the id via `useParams()`. |
| `app/page.jsx` | The animated splash. The web copy's `/` comes from `(marketing)/page.jsx`, which is excluded — copying it in would give two routes resolving to `/` and fail the build. |
| `components/marketing/Footer.jsx` | Drops the `/pricing` link; that route isn't shipped here. |

If a build ever fails with *"missing generateStaticParams"* or *"duplicate
route /"*, something bypassed the sync script.
