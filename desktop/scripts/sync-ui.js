#!/usr/bin/env node
// Copies the web client into desktop/app, which is the copy of the UI bundled
// in the installer and shown when the machine is offline.
//
// Doing this by hand kept going wrong in the same two ways: the marketing
// landing page came back and collided with the desktop splash screen at "/",
// and the placeholder generateStaticParams were wiped, breaking
// `output: export`. Those files are now listed as desktop-owned and are never
// overwritten.
//
// Note that desktop-only FEATURES do not belong here — they belong in the web
// client. When online the app loads the deployed website, so anything that
// exists only in this folder is invisible except when offline. The rule is:
// desktop features live in client/ and no-op in a browser; this list is only
// for files that genuinely cannot be identical.
//
// Run: npm run sync   (build/export runs it automatically)

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "client");
const DEST = path.join(ROOT, "app");

// Files the desktop build owns. The web copy never overwrites these.
const DESKTOP_OWNED = new Set(
  [
    // The animated splash that replaces the marketing landing page at "/".
    "src/app/page.jsx",
    // Drops the /pricing link, which this build doesn't ship.
    "src/components/marketing/Footer.jsx",
    // Each returns one placeholder id so `output: export` has a route to emit.
    "src/app/(dashboard)/invoices/[id]/page.jsx",
    "src/app/(dashboard)/invoices/[id]/print/page.jsx",
    "src/app/(dashboard)/invoices/[id]/send/page.jsx",
    "src/app/(dashboard)/purchase-orders/[id]/page.jsx",
    "src/app/(dashboard)/quotations/[id]/page.jsx",
    "src/app/(dashboard)/rfqs/[id]/page.jsx",
    "src/app/(dashboard)/vendors/[id]/page.jsx",
  ].map(norm)
);

// Web-only paths. `/` belongs to the splash screen here, so the marketing page
// would be a duplicate-route build error; /pricing is simply not shipped.
const WEB_ONLY = ["src/app/(marketing)/page.jsx", "src/app/(marketing)/pricing"].map(norm);

// Directories copied wholesale.
const TREES = ["src", "public"];

function norm(p) {
  return p.split(path.sep).join("/");
}

function isWebOnly(rel) {
  return WEB_ONLY.some((w) => rel === w || rel.startsWith(w + "/"));
}

let copied = 0;
let skipped = 0;
let pruned = 0;

function copyTree(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DEST, rel);
  if (!fs.existsSync(from)) return;

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const childRel = norm(path.join(rel, entry.name));
    if (isWebOnly(childRel)) continue;

    if (entry.isDirectory()) {
      copyTree(childRel);
      continue;
    }
    if (DESKTOP_OWNED.has(childRel)) {
      skipped++;
      continue;
    }

    const src = path.join(SRC, childRel);
    const dst = path.join(DEST, childRel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });

    // Compare before writing so mtimes only move for files that changed —
    // Next's build cache keys off them.
    const next = fs.readFileSync(src);
    if (fs.existsSync(dst) && fs.readFileSync(dst).equals(next)) continue;
    fs.writeFileSync(dst, next);
    copied++;
  }
  void to;
}

/** Delete anything in the desktop copy that no longer exists in the client. */
function prune(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DEST, rel);
  if (!fs.existsSync(to)) return;

  for (const entry of fs.readdirSync(to, { withFileTypes: true })) {
    const childRel = norm(path.join(rel, entry.name));
    if (DESKTOP_OWNED.has(childRel)) continue;

    const counterpart = path.join(SRC, childRel);
    if (entry.isDirectory()) {
      if (!fs.existsSync(counterpart) || isWebOnly(childRel)) {
        fs.rmSync(path.join(DEST, childRel), { recursive: true, force: true });
        pruned++;
      } else {
        prune(childRel);
      }
    } else if (!fs.existsSync(counterpart) || isWebOnly(childRel)) {
      fs.rmSync(path.join(DEST, childRel), { force: true });
      pruned++;
    }
  }
  void from;
}

/** Keep runtime dependencies identical; leave name/scripts/config alone. */
function syncDependencies() {
  const srcPkgPath = path.join(SRC, "package.json");
  const dstPkgPath = path.join(DEST, "package.json");
  if (!fs.existsSync(srcPkgPath) || !fs.existsSync(dstPkgPath)) return false;

  const srcPkg = JSON.parse(fs.readFileSync(srcPkgPath, "utf8"));
  const dstPkg = JSON.parse(fs.readFileSync(dstPkgPath, "utf8"));

  const before = JSON.stringify(dstPkg.dependencies || {});
  const after = JSON.stringify(srcPkg.dependencies || {});
  if (before === after) return false;

  dstPkg.dependencies = srcPkg.dependencies;
  fs.writeFileSync(dstPkgPath, JSON.stringify(dstPkg, null, 2) + "\n");
  return true;
}

console.log(`\nSyncing ${norm(path.relative(process.cwd(), SRC))} → ${norm(path.relative(process.cwd(), DEST))}\n`);

// This folder is meant to stay buildable on its own — copied to another machine,
// handed to a CI runner, archived. `app/` already holds a complete copy of the
// UI, so a missing client is a skipped step, not a failure.
if (!fs.existsSync(SRC)) {
  console.log("  no ../client alongside this folder — building from the copy in app/\n");
  process.exit(0);
}

for (const tree of TREES) {
  copyTree(tree);
  prune(tree);
}
const depsChanged = syncDependencies();

console.log(`  ${copied} file(s) updated`);
console.log(`  ${skipped} desktop-owned file(s) left alone`);
console.log(`  ${pruned} stale path(s) removed`);
if (depsChanged) {
  console.log("\n  dependencies changed — run: npm --prefix app install");
}
console.log("");
