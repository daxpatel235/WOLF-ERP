/** @type {import('next').NextConfig} */

// Desktop build: ALWAYS a fully static export. Tauri serves these files from
// inside the installed app bundle, so there is no Node server at runtime —
// SSR, middleware and the image optimizer are all off by necessity.
//
// This is the standalone copy of the client that ships in the .exe/.msi; the
// web deployment keeps its own next.config.js with SSR intact.
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Emit each route as a folder/index.html so clean URLs resolve without a
  // server rewrite.
  trailingSlash: true,
  // The installer build must not fail on lint; CI lints the web copy.
  eslint: { ignoreDuringBuilds: true },
  // Source maps would ship the original, unminified source inside the installer
  // — readable with a text editor. Off is the Next default; pinned so it can't
  // be turned on by accident.
  productionBrowserSourceMaps: false,
  // Don't advertise the framework version to anything inspecting the app.
  poweredByHeader: false,
};

module.exports = nextConfig;
