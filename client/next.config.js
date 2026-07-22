/** @type {import('next').NextConfig} */

// The desktop (Tauri) build sets WOLF_DESKTOP=1 to produce a fully static export
// that Tauri can serve from the local filesystem. The normal web build (Render)
// is unaffected and keeps SSR/middleware behaviour.
const isDesktop = process.env.WOLF_DESKTOP === "1";

const nextConfig = isDesktop
  ? {
      output: "export",
      // Static export can't use the Next image optimizer (no server at runtime).
      images: { unoptimized: true },
      // Emit each route as a folder/index.html so the asset protocol resolves
      // clean URLs without a server rewrite.
      trailingSlash: true,
    }
  : {};

module.exports = nextConfig;
