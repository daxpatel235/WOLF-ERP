#!/usr/bin/env node
// Checks a built release for the things that most often leak out of a desktop
// app: source maps, developer paths, and credentials baked into the bundle.
// Run after `npm run build`. Exits non-zero if anything fails.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "app", "out");
const EXE = path.join(ROOT, "src-tauri", "target", "release", "wolf-erp-desktop.exe");

let failures = 0;
const pass = (m) => console.log("  PASS  " + m);
const fail = (m) => {
  console.log("  FAIL  " + m);
  failures++;
};
const skip = (m) => console.log("  SKIP  " + m);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

console.log("\nWolf ERP — bundle audit\n");

// 1. Source maps would ship the original source verbatim.
console.log("Source maps");
const maps = walk(OUT).filter((f) => f.endsWith(".map"));
maps.length === 0
  ? pass("no .map files in the frontend bundle")
  : fail(`${maps.length} source map(s) shipped: ${maps.slice(0, 3).join(", ")}`);

// 2. Developer identity / paths inside the binary.
console.log("\nBinary path leakage");
if (!fs.existsSync(EXE)) {
  skip("release binary not built yet");
} else {
  const buf = fs.readFileSync(EXE);
  const hay = buf.toString("latin1");
  const home = require("os").homedir();
  const user = path.basename(home);

  const checks = [
    [`username "${user}"`, user],
    ["home directory", home],
    ["project directory", ROOT],
  ];
  for (const [label, needle] of checks) {
    if (!needle || needle.length < 3) continue;
    // Count occurrences without building a regex from a path.
    let n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
    n === 0 ? pass(`${label} not present`) : fail(`${label} appears ${n}x`);
  }
}

// 3. Credentials in the JS bundle. Deliberately narrow patterns — matching the
//    bare word "secret" produces false positives from crypto libraries.
console.log("\nCredentials in the frontend bundle");
const SECRET_PATTERNS = [
  [/AIza[0-9A-Za-z_-]{30,}/g, "Google API key"],
  [/sk-[A-Za-z0-9]{20,}/g, "OpenAI-style key"],
  [/gsk_[A-Za-z0-9]{20,}/g, "Groq key"],
  [/mongodb(\+srv)?:\/\/[^\s"']+/g, "MongoDB connection string"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "hard-coded JWT"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, "private key"],
];
const jsFiles = walk(OUT).filter((f) => f.endsWith(".js"));
let found = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(f, "utf8");
  for (const [re, label] of SECRET_PATTERNS) {
    const m = src.match(re);
    if (m) {
      fail(`${label} in ${path.relative(OUT, f)}: ${m[0].slice(0, 24)}…`);
      found++;
    }
  }
}
if (found === 0) pass(`no credential patterns across ${jsFiles.length} JS files`);

// 4. Hardening flags that are easy to regress.
console.log("\nHardening configuration");
const conf = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src-tauri", "tauri.conf.json"), "utf8")
);
conf.app?.security?.csp
  ? pass("CSP is set")
  : fail("CSP is null — the webview is unrestricted");
conf.app?.withGlobalTauri === false
  ? pass("withGlobalTauri disabled")
  : fail("withGlobalTauri is on — the native API is reachable from any script");
const connect = conf.app?.security?.csp?.["connect-src"] || "";
/^[^h]*ipc:/.test(connect) && !connect.includes("https://*")
  ? pass("connect-src restricted to IPC (blocks XSS exfiltration)")
  : fail(`connect-src is permissive: ${connect}`);

// 5. Update channel. An unsigned or plaintext channel is a code-execution path
//    straight onto the user's machine, so these are not optional.
console.log("\nUpdate channel");
const updater = conf.plugins?.updater;
if (!updater) {
  fail("no updater configured — shell fixes would need a manual reinstall");
} else {
  updater.pubkey
    ? pass("update signatures are verified against a pinned public key")
    : fail("no pubkey — the app would install any payload the endpoint returns");

  const endpoints = updater.endpoints || [];
  endpoints.length && endpoints.every((u) => u.startsWith("https://"))
    ? pass(`${endpoints.length} update endpoint(s), all HTTPS`)
    : fail(`update endpoints must all be HTTPS: ${endpoints.join(", ") || "none"}`);
}

// 6. What the live website is trusted with.
//
//    The window loads the deployed site, which makes that origin part of the
//    app's trust boundary. It legitimately needs IPC for the offline cache and
//    session; it must NOT get the Rust HTTP client, or an XSS on the site could
//    use the desktop app as a proxy that ignores CORS and hits internal hosts
//    the browser would never let it reach.
console.log("\nRemote origin permissions");
const capDir = path.join(ROOT, "src-tauri", "capabilities");
const caps = fs.existsSync(capDir)
  ? fs.readdirSync(capDir).filter((f) => f.endsWith(".json"))
  : [];
let remoteCaps = 0;
for (const file of caps) {
  const cap = JSON.parse(fs.readFileSync(path.join(capDir, file), "utf8"));
  const urls = cap.remote?.urls;
  if (!urls?.length) continue;
  remoteCaps++;

  urls.every((u) => u.startsWith("https://") && !u.includes("*"))
    ? pass(`${file}: remote origins pinned (${urls.join(", ")})`)
    : fail(`${file}: remote origins must be exact HTTPS URLs — got ${urls.join(", ")}`);

  const names = (cap.permissions || []).map((p) =>
    typeof p === "string" ? p : p.identifier
  );
  names.some((n) => n?.startsWith("http:"))
    ? fail(`${file}: grants the Rust HTTP client to a remote origin`)
    : pass(`${file}: no HTTP-client access from remote content`);
}
if (remoteCaps === 0) skip("no remote origins are granted IPC");

console.log(
  failures === 0
    ? "\nAll checks passed.\n"
    : `\n${failures} check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
