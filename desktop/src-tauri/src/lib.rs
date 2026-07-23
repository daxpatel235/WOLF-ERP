// Wolf ERP desktop shell.
//
// Three things this shell does that a plain browser window does not:
//
//   1. LIVE UI. The window loads the deployed website, so a push to Vercel
//      reaches the desktop app on its next launch — no rebuild, no reinstall.
//      If the network is down at startup it falls back to the copy of the UI
//      bundled inside the installer, so the app still opens.
//
//   2. OFFLINE SNAPSHOT. Every successful API read is mirrored to a `backup`
//      folder under the user's app-data directory. With no connection the app
//      serves that snapshot read-only — you see the data as it was when you
//      were last online, instead of an error page.
//
//   3. SELF-UPDATE. The shell checks for a newer signed release on launch and
//      installs it in place.
//
// The cache and the auth token live in Rust rather than in browser storage on
// purpose. The live site and the bundled fallback are different origins, and
// localStorage is per-origin — anything kept there would vanish the moment the
// app switched between them. The filesystem is the only storage both can see.

use std::collections::BTreeMap;
use std::fs;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Hosted Wolf ERP backend — what a fresh install talks to.
const DEFAULT_API_URL: &str = "https://wolf-erp-api.onrender.com/api";
/// The deployed web app. This is also the UI the window loads when online.
const WEB_APP_URL: &str = "https://wolf-erp.vercel.app";
/// Where the window actually opens when online.
///
/// Not "/" — that is the marketing landing page, and it is server-rendered, so
/// its HTML would paint before any script could redirect away from it. `/desktop`
/// is the splash screen, which hands over to sign-in or to the workspace.
const WEB_APP_ENTRY: &str = "https://wolf-erp.vercel.app/desktop";
/// How long to wait for the network before deciding to boot offline. Long
/// enough for a slow DNS lookup, short enough not to feel like a hang.
const REACHABILITY_TIMEOUT: Duration = Duration::from_millis(2500);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DesktopConfig {
    #[serde(default = "default_api_url")]
    api_url: String,
    /// Set false to always use the UI bundled in the installer. Useful when the
    /// live site is mid-deploy, or for reproducing a bug against a known build.
    #[serde(default = "default_true")]
    live_ui: bool,
}

fn default_api_url() -> String {
    DEFAULT_API_URL.to_string()
}
fn default_true() -> bool {
    true
}

impl Default for DesktopConfig {
    fn default() -> Self {
        Self {
            api_url: default_api_url(),
            live_ui: true,
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Settings file
// ---------------------------------------------------------------------------

fn config_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join("settings.json"))
}

fn load_config(app: &tauri::AppHandle) -> DesktopConfig {
    // A missing or corrupt file must never stop the app booting — fall back to
    // the shipped default and let the user fix it from Settings.
    config_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|raw| serde_json::from_str::<DesktopConfig>(&raw).ok())
        .unwrap_or_default()
}

fn save_config(app: &tauri::AppHandle, cfg: &DesktopConfig) -> Result<(), String> {
    let path = config_path(app).ok_or("could not resolve the config directory")?;
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

/// Is `host` accepting connections right now?
///
/// A TCP connect rather than an HTTP request: it needs no HTTP client, and it
/// answers the only question that matters at startup — can the webview load a
/// page from this host at all. DNS resolution is part of the check, so a
/// captive portal or a dead link both come back false.
fn host_reachable(url: &str) -> bool {
    let parsed = match tauri::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return false,
    };
    let host = match parsed.host_str() {
        Some(h) => h,
        None => return false,
    };
    let port = parsed.port_or_known_default().unwrap_or(443);

    // to_socket_addrs performs the DNS lookup and can itself block; it is
    // bounded in practice by the resolver's own timeout.
    let addrs = match (host, port).to_socket_addrs() {
        Ok(a) => a,
        Err(_) => return false,
    };
    for addr in addrs {
        if TcpStream::connect_timeout(&addr, REACHABILITY_TIMEOUT).is_ok() {
            return true;
        }
    }
    false
}

/// Is the live UI actually being served, as opposed to merely resolvable?
///
/// The TCP check alone is not enough to point the window at a URL. A host can
/// answer on 443 and still return 404 or 502 — mid-deploy, or if the app is
/// installed before the matching site is published. Pointing the window at that
/// would strand the user on an error page with no address bar and no way to
/// reach Settings to turn the live UI off. Requiring a success status means the
/// bundled copy takes over instead, which is a working app.
fn entry_serving(url: &str) -> bool {
    if !host_reachable(url) {
        return false;
    }
    tauri::async_runtime::block_on(async {
        let Ok(client) = reqwest::Client::builder()
            .timeout(REACHABILITY_TIMEOUT)
            .build()
        else {
            return false;
        };
        match client.get(url).send().await {
            Ok(res) => res.status().is_success(),
            Err(_) => false,
        }
    })
}

// ---------------------------------------------------------------------------
// Offline snapshot cache
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheEntry {
    key: String,
    /// Unix milliseconds — the frontend renders this as "showing data from …".
    saved_at: u64,
    /// The raw response body, stored verbatim so it round-trips exactly.
    body: String,
}

#[derive(Debug, Serialize)]
struct CacheInfo {
    entries: usize,
    bytes: u64,
    /// Newest `saved_at` across all entries, i.e. when the app last synced.
    newest: u64,
    dir: String,
}

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("backup");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Map an API path to a filename.
///
/// Cache keys are request paths like `/purchase-orders?status=Approved`, which
/// contain characters Windows forbids in filenames and can exceed the length
/// limit. A readable prefix keeps the folder browsable; the FNV-1a suffix is
/// what actually guarantees uniqueness, so two paths sharing a prefix can never
/// collide.
fn key_to_filename(key: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in key.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x1000_0000_01b3);
    }
    let slug: String = key
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .take(48)
        .collect();
    format!("{slug}-{hash:016x}.json")
}

/// Upper bound on cached responses.
///
/// Each distinct query string is its own entry, so search terms and filter
/// combinations multiply: without a cap the folder would grow for as long as the
/// app is used. Well above the number of pages a real session touches, so
/// eviction only ever discards long-unused queries.
const CACHE_MAX_ENTRIES: usize = 500;

/// Drop the oldest entries once the cache is over its limit.
///
/// Only reads metadata to decide, not file contents — this runs on the write
/// path and must stay cheap.
fn evict_if_needed(dir: &PathBuf) {
    let Ok(read) = fs::read_dir(dir) else { return };
    let mut files: Vec<(SystemTime, PathBuf)> = read
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("json"))
        .filter_map(|e| {
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((modified, e.path()))
        })
        .collect();

    if files.len() <= CACHE_MAX_ENTRIES {
        return;
    }

    files.sort_by_key(|(modified, _)| *modified);
    for (_, path) in files.iter().take(files.len() - CACHE_MAX_ENTRIES) {
        let _ = fs::remove_file(path);
    }
}

#[tauri::command]
fn cache_put(app: tauri::AppHandle, key: String, body: String) -> Result<(), String> {
    let entry = CacheEntry {
        key: key.clone(),
        saved_at: now_ms(),
        body,
    };
    let dir = cache_dir(&app)?;
    let path = dir.join(key_to_filename(&key));
    let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    evict_if_needed(&dir);
    Ok(())
}

#[tauri::command]
fn cache_get(app: tauri::AppHandle, key: String) -> Option<CacheEntry> {
    let path = cache_dir(&app).ok()?.join(key_to_filename(&key));
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

/// Read whichever of `keys` are present in `dir`.
///
/// Missing and unreadable entries are simply absent from the result — a caller
/// priming a cache has nothing useful to do with the difference between a key
/// that was never saved and one whose file is truncated.
fn read_entries(dir: &PathBuf, keys: &[String]) -> Vec<CacheEntry> {
    keys.iter()
        .filter_map(|key| {
            let raw = fs::read_to_string(dir.join(key_to_filename(key))).ok()?;
            serde_json::from_str(&raw).ok()
        })
        .collect()
}

/// Read several entries in one call.
///
/// The frontend primes its in-memory cache from the snapshot at launch so the
/// first screen paints from disk instead of waiting on the network. That means
/// ~ten reads before the window can show anything useful, and ten separate
/// `cache_get` round trips through the IPC bridge would put the cost back where
/// it was taken from. Asking for them together makes it one.
#[tauri::command]
fn cache_get_many(app: tauri::AppHandle, keys: Vec<String>) -> Vec<CacheEntry> {
    match cache_dir(&app) {
        Ok(dir) => read_entries(&dir, &keys),
        Err(_) => Vec::new(),
    }
}

#[tauri::command]
fn cache_clear(app: tauri::AppHandle) -> Result<usize, String> {
    let dir = cache_dir(&app)?;
    let mut removed = 0;
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|s| s.to_str()) == Some("json")
            && fs::remove_file(entry.path()).is_ok()
        {
            removed += 1;
        }
    }
    Ok(removed)
}

#[tauri::command]
fn cache_info(app: tauri::AppHandle) -> Result<CacheInfo, String> {
    let dir = cache_dir(&app)?;
    let mut entries = 0;
    let mut bytes = 0;
    let mut newest = 0;

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        entries += 1;
        if let Ok(meta) = entry.metadata() {
            bytes += meta.len();
        }
        // saved_at comes from the entry rather than the file mtime, which a
        // backup or sync tool is free to rewrite.
        if let Some(saved) = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str::<CacheEntry>(&raw).ok())
            .map(|e| e.saved_at)
        {
            newest = newest.max(saved);
        }
    }

    Ok(CacheInfo {
        entries,
        bytes,
        newest,
        dir: dir.to_string_lossy().to_string(),
    })
}

// ---------------------------------------------------------------------------
// Cross-origin secret store
// ---------------------------------------------------------------------------
//
// Holds the session token so signing in on the live UI keeps you signed in when
// the app later boots from the bundled fallback (a different origin, hence a
// different localStorage). The file sits in the user's own AppData, which
// Windows ACLs to that account — the same protection level as the browser
// profile the token would otherwise live in. It is not encrypted at rest; see
// the Security section of the README.

fn secrets_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("session.json"))
}

fn load_secrets(app: &tauri::AppHandle) -> BTreeMap<String, String> {
    secrets_path(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn save_secrets(app: &tauri::AppHandle, map: &BTreeMap<String, String>) -> Result<(), String> {
    let path = secrets_path(app)?;
    let json = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn secret_get(app: tauri::AppHandle, key: String) -> Option<String> {
    load_secrets(&app).get(&key).cloned()
}

#[tauri::command]
fn secret_set(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let mut map = load_secrets(&app);
    map.insert(key, value);
    save_secrets(&app, &map)
}

#[tauri::command]
fn secret_del(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let mut map = load_secrets(&app);
    map.remove(&key);
    save_secrets(&app, &map)
}

// ---------------------------------------------------------------------------
// Misc commands callable from the web layer
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_api_url(app: tauri::AppHandle) -> String {
    load_config(&app).api_url
}

#[tauri::command]
fn set_api_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim().trim_end_matches('/').to_string();
    if trimmed.is_empty() {
        return Err("The API URL cannot be empty.".into());
    }
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err("The API URL must start with http:// or https://".into());
    }
    let mut cfg = load_config(&app);
    cfg.api_url = trimmed;
    save_config(&app, &cfg)
}

#[tauri::command]
fn get_live_ui(app: tauri::AppHandle) -> bool {
    load_config(&app).live_ui
}

#[tauri::command]
fn set_live_ui(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let mut cfg = load_config(&app);
    cfg.live_ui = enabled;
    save_config(&app, &cfg)
}

/// Re-probe the network. The frontend calls this to offer "Try again" without
/// making the user restart the app.
///
/// Probes the API host, not the website: the offline banner is about whether
/// data can be fetched, and those are two different hosts that can fail
/// independently. A plain TCP check, because the API root legitimately 404s.
#[tauri::command]
fn check_online(app: tauri::AppHandle) -> bool {
    host_reachable(&load_config(&app).api_url)
}

/// Check for an update on demand, for the button in Settings.
///
/// Returns the version that was downloaded, or `None` when already current —
/// so the UI can distinguish "you're up to date" from "installing".
#[tauri::command]
async fn check_updates_now(app: tauri::AppHandle) -> Result<Option<String>, String> {
    check_for_update(app).await
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open_in_browser(&url)
}

#[tauri::command]
fn web_app_url() -> String {
    WEB_APP_URL.to_string()
}

/// Hand a URL to the system default browser.
///
/// Uses the shell `start` verb rather than pulling in an opener crate — this
/// build is Windows-only, and one less dependency is one less version to keep
/// in step. The empty `""` argument is the window title `start` expects, and
/// without it a quoted URL would be swallowed as the title.
fn open_in_browser(url: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Refusing to open a non-web URL.".into());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let cmd = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        std::process::Command::new(cmd)
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Does this URL belong to the app itself, as opposed to the wider web?
///
/// Covers the bundled fallback (the `tauri://` asset protocol, which Windows
/// serves as http://tauri.localhost) and every page of the live deployment.
fn is_app_url(url: &tauri::Url) -> bool {
    let scheme = url.scheme();
    if scheme == "tauri" {
        return true;
    }
    let host = match url.host_str() {
        Some(h) => h,
        None => return false,
    };
    if host == "tauri.localhost" {
        return true;
    }
    tauri::Url::parse(WEB_APP_URL)
        .ok()
        .and_then(|w| w.host_str().map(|h| h == host))
        .unwrap_or(false)
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_api_url,
            set_api_url,
            get_live_ui,
            set_live_ui,
            check_online,
            check_updates_now,
            open_external,
            web_app_url,
            cache_put,
            cache_get,
            cache_get_many,
            cache_clear,
            cache_info,
            secret_get,
            secret_set,
            secret_del,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let cfg = load_config(&handle);

            // Decide where the UI comes from before the window exists, because
            // the choice is the window's start URL.
            let online = cfg.live_ui && entry_serving(WEB_APP_ENTRY);
            let start_url = if online {
                tauri::Url::parse(WEB_APP_ENTRY)
                    .map(WebviewUrl::External)
                    .unwrap_or_else(|_| WebviewUrl::App("index.html".into()))
            } else {
                // The bundled copy's "/" is the same splash screen.
                WebviewUrl::App("index.html".into())
            };

            // Injected before any page script runs, so the client's
            // module-level constants resolve to these on first evaluation.
            // This runs on the live site too — that is how the deployed build
            // knows it is inside the desktop shell rather than a browser.
            let boot = format!(
                r#"
                window.__WOLF_DESKTOP__ = true;
                window.__WOLF_API_URL__ = {api};
                window.__WOLF_WEB_URL__ = {web};
                window.__WOLF_VERSION__ = {ver};
                window.__WOLF_ONLINE__ = {online};
                window.__WOLF_LIVE_UI__ = {live};
                "#,
                api = serde_json::to_string(&cfg.api_url).unwrap_or_else(|_| "\"\"".into()),
                web = serde_json::to_string(WEB_APP_URL).unwrap_or_else(|_| "\"\"".into()),
                ver = serde_json::to_string(env!("CARGO_PKG_VERSION"))
                    .unwrap_or_else(|_| "\"\"".into()),
                online = online,
                live = cfg.live_ui,
            );

            let window = WebviewWindowBuilder::new(app, "main", start_url)
                .title("Wolf ERP — Procurement")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 640.0)
                .center()
                .resizable(true)
                .initialization_script(&boot)
                // Anything that isn't Wolf ERP is a real website (vendor
                // portals, docs, a payment page) and belongs in the browser,
                // not trapped inside the app frame with no address bar or back
                // button.
                .on_navigation(move |url| {
                    if is_app_url(url) {
                        return true;
                    }
                    if url.scheme() == "http" || url.scheme() == "https" {
                        let _ = open_in_browser(url.as_str());
                        return false;
                    }
                    true
                })
                .build()?;

            // Maximise on first paint — an ERP grid wants the whole screen.
            let _ = window.maximize();
            let _ = handle.emit("wolf://ready", online);

            // Check for a new shell release in the background. Failure here is
            // never fatal: a missing manifest, an offline machine or an
            // unreachable host all just mean "no update this launch".
            let updater_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = check_for_update(updater_handle).await {
                    eprintln!("update check skipped: {err}");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Wolf ERP desktop app");
}

/// Download and install a newer signed release, then let the frontend decide
/// when to restart.
///
/// Only the Rust shell needs this. UI changes arrive over the network on the
/// next launch, so releases here are rare — native code, window behaviour, new
/// commands.
async fn check_for_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;

    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;

    let Some(update) = update else {
        return Ok(None);
    };

    let version = update.version.clone();
    let _ = app.emit("wolf://update-downloading", &version);

    update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    // Installed on disk; it takes effect on the next launch. Prompting beats
    // yanking the window away from someone mid-approval.
    let _ = app.emit("wolf://update-ready", &version);
    Ok(Some(version))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Write an entry the way `cache_put` does, so the test exercises the real
    /// on-disk shape rather than one invented for it.
    fn put(dir: &PathBuf, key: &str, body: &str, saved_at: u64) {
        let entry = CacheEntry {
            key: key.to_string(),
            saved_at,
            body: body.to_string(),
        };
        fs::write(
            dir.join(key_to_filename(key)),
            serde_json::to_string(&entry).unwrap(),
        )
        .unwrap();
    }

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("wolf-cache-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn reads_back_what_cache_put_wrote() {
        let dir = temp_dir("roundtrip");
        put(&dir, "/vendors", r#"{"data":[1,2]}"#, 1_700_000_000_000);
        put(&dir, "/reports/summary", r#"{"data":{}}"#, 1_700_000_000_001);

        let found = read_entries(
            &dir,
            &["/vendors".to_string(), "/reports/summary".to_string()],
        );
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].key, "/vendors");
        assert_eq!(found[0].body, r#"{"data":[1,2]}"#);
        assert_eq!(found[0].saved_at, 1_700_000_000_000);
    }

    #[test]
    fn skips_what_is_missing_rather_than_failing() {
        let dir = temp_dir("missing");
        put(&dir, "/invoices", "{}", 1);

        let found = read_entries(
            &dir,
            &[
                "/never-fetched".to_string(),
                "/invoices".to_string(),
                "/also-missing".to_string(),
            ],
        );
        assert_eq!(found.len(), 1, "only the entry that exists comes back");
        assert_eq!(found[0].key, "/invoices");
    }

    #[test]
    fn a_truncated_file_is_treated_as_absent() {
        let dir = temp_dir("truncated");
        fs::write(dir.join(key_to_filename("/rfqs")), "{\"key\":\"/rfqs\",\"sav").unwrap();
        put(&dir, "/quotations", "{}", 1);

        let found = read_entries(&dir, &["/rfqs".to_string(), "/quotations".to_string()]);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].key, "/quotations");
    }

    #[test]
    fn query_strings_are_distinct_entries() {
        // The dashboard caches "/approvals?status=Pending" separately from the
        // full "/approvals" list; if these collided one screen would show the
        // other's rows.
        let dir = temp_dir("querystring");
        put(&dir, "/approvals", r#"{"data":"all"}"#, 1);
        put(&dir, "/approvals?status=Pending", r#"{"data":"pending"}"#, 2);

        let found = read_entries(
            &dir,
            &[
                "/approvals".to_string(),
                "/approvals?status=Pending".to_string(),
            ],
        );
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].body, r#"{"data":"all"}"#);
        assert_eq!(found[1].body, r#"{"data":"pending"}"#);
    }

    #[test]
    fn missing_directory_yields_nothing() {
        let dir = std::env::temp_dir().join("wolf-cache-test-nonexistent");
        let _ = fs::remove_dir_all(&dir);
        assert!(read_entries(&dir, &["/vendors".to_string()]).is_empty());
    }
}
