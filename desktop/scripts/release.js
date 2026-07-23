#!/usr/bin/env node
// Publishes a desktop release: builds the signed installers, writes the update
// manifest, and uploads both to GitHub Releases.
//
// You only need this for changes to the Rust shell — window behaviour, native
// commands, the offline cache. UI changes reach installed apps over the network
// on the next launch, so they need nothing here.
//
//   node scripts/release.js            # release the current version
//   node scripts/release.js 1.1.0      # bump to 1.1.0, then release
//   node scripts/release.js --dry-run  # build + write the manifest, no upload
//
// The endpoint the app polls is the `latest.json` attached to the newest
// release, so publishing here is what makes an update visible.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TAURI_CONF = path.join(ROOT, "src-tauri", "tauri.conf.json");
const CARGO_TOML = path.join(ROOT, "src-tauri", "Cargo.toml");
const BUNDLE = path.join(ROOT, "src-tauri", "target", "release", "bundle");
const DIST = path.join(ROOT, "dist");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const newVersion = args.find((a) => /^\d+\.\d+\.\d+$/.test(a));

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(" ")} exited with ${res.status}`);
  }
}

function capture(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return res.status === 0 ? res.stdout.trim() : null;
}

// --- version -------------------------------------------------------------

const conf = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));

if (newVersion) {
  conf.version = newVersion;
  fs.writeFileSync(TAURI_CONF, JSON.stringify(conf, null, 2) + "\n");

  // Cargo.toml carries the version the running app reports, so the two must
  // not drift — the updater compares against it to decide "is this newer".
  const cargo = fs.readFileSync(CARGO_TOML, "utf8");
  fs.writeFileSync(
    CARGO_TOML,
    cargo.replace(/^version = ".*"$/m, `version = "${newVersion}"`)
  );
  console.log(`\nVersion set to ${newVersion}\n`);
}

const version = conf.version;
const tag = `desktop-v${version}`;

// --- guard rails ---------------------------------------------------------

const pubkey = conf.plugins?.updater?.pubkey;
if (!pubkey) {
  console.error("tauri.conf.json has no updater public key — updates cannot be verified.");
  process.exit(1);
}

if (!dryRun && !capture("gh", ["--version"])) {
  console.error(
    "The GitHub CLI (gh) is required to publish.\n" +
      "Install it from https://cli.github.com, run `gh auth login`, or use --dry-run."
  );
  process.exit(1);
}

// --- build ---------------------------------------------------------------

console.log(`\nBuilding Wolf ERP ${version}\n`);
run("npm", ["run", "build:all"]);

// --- collect artifacts ---------------------------------------------------

// `createUpdaterArtifacts` emits a zipped installer plus a detached signature.
// The .sig is what the installed app checks before it will run the download.
function findUpdaterArtifact() {
  const dir = path.join(BUNDLE, "nsis");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const zip = files.find((f) => f.endsWith(".nsis.zip"));
  const sig = files.find((f) => f.endsWith(".nsis.zip.sig"));
  if (!zip || !sig) return null;
  return {
    zip: path.join(dir, zip),
    sig: path.join(dir, sig),
    name: zip,
  };
}

/** Gather the installers out of the nested bundle tree into dist/. */
function collectInstallers() {
  fs.mkdirSync(DIST, { recursive: true });
  const found = [];
  for (const [dir, ext] of [
    ["nsis", ".exe"],
    ["msi", ".msi"],
  ]) {
    const from = path.join(BUNDLE, dir);
    if (!fs.existsSync(from)) continue;
    for (const file of fs.readdirSync(from)) {
      // `.nsis.zip` also lives in the nsis folder; only the installer itself.
      if (!file.endsWith(ext)) continue;
      const dest = path.join(DIST, file);
      fs.copyFileSync(path.join(from, file), dest);
      found.push(dest);
    }
  }
  return found;
}

const artifact = findUpdaterArtifact();
if (!artifact) {
  console.error(
    "\nNo updater artifact was produced.\n" +
      "This almost always means the build had no signing key — check for the\n" +
      "warning from scripts/build.js and confirm ~/.tauri/wolf-erp-updater.key exists."
  );
  process.exit(1);
}

// GitHub rewrites spaces in asset filenames to dots; the manifest URL has to
// match what will actually be served, not what is on disk.
const assetName = artifact.name.replace(/ /g, ".");
const downloadUrl = `https://github.com/daxpatel235/WOLF-ERP/releases/download/${tag}/${assetName}`;

const manifest = {
  version,
  notes: `Wolf ERP desktop ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: fs.readFileSync(artifact.sig, "utf8").trim(),
      url: downloadUrl,
    },
  },
};

fs.mkdirSync(DIST, { recursive: true });
const manifestPath = path.join(DIST, "latest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`\nWrote ${path.relative(ROOT, manifestPath)}`);
console.log(`  version   ${version}`);
console.log(`  asset     ${assetName}`);
console.log(`  url       ${downloadUrl}\n`);

if (dryRun) {
  const staged = collectInstallers();
  console.log(`Dry run — nothing uploaded. ${staged.length} installer(s) staged in dist/.\n`);
  process.exit(0);
}

// --- publish -------------------------------------------------------------

const installers = collectInstallers();
if (installers.length === 0) {
  console.error("No installers were produced — nothing to publish.");
  process.exit(1);
}

// The app polls .../releases/latest/download/latest.json, so this release must
// end up as "latest" — hence no --prerelease here.
run("gh", [
  "release",
  "create",
  tag,
  ...installers.map((p) => `"${p}"`),
  `"${artifact.zip}"`,
  `"${manifestPath}"`,
  "--title",
  `"Wolf ERP Desktop ${version}"`,
  "--notes",
  `"Desktop shell ${version}. The interface updates itself from the website; this release covers the app itself."`,
]);

console.log(`\nPublished ${tag}.`);
console.log("Installed copies will pick it up the next time they launch.\n");
