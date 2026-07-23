"use client";

// Desktop launch screen, served from the web deployment.
//
// This is the URL the Tauri shell opens. It exists here rather than only in the
// bundled copy because the desktop app loads the live site — and "/" on the live
// site is the marketing landing page, which is a server component, so its HTML
// would paint before any client-side check could redirect away from it. Giving
// the shell its own entry route avoids that flash entirely.
//
// An installed app has already been "sold", so this is a short branded intro
// that hands straight over to sign-in — or to the workspace if a session
// survived. It also buys cover for auth hydration: AuthContext reads storage and
// re-validates the token on mount, so without this the app would flash the login
// form at people who are already signed in.
//
// Nothing links here on the web; visiting it in a browser just lands on /login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";

// Long enough for the animation to land, short enough not to be in the way.
const MIN_SPLASH_MS = 2000;

export default function SplashPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Navigate once BOTH the intro has played and auth has settled — otherwise a
  // fast hydration would cut the animation off mid-way, and a slow one would
  // send an already-signed-in user to the login form.
  useEffect(() => {
    if (!minElapsed || loading) return;
    setLeaving(true);
    const dest = user ? ROLE_HOME[user.role] || "/dashboard" : "/login";
    const t = setTimeout(() => router.replace(dest), 320); // let the fade finish
    return () => clearTimeout(t);
  }, [minElapsed, loading, user, router]);

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-slate-900 grid place-items-center transition-opacity duration-300 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-brand/20 blur-3xl splash-glow" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand/10 blur-3xl splash-glow splash-glow-delay" />

      <div className="relative flex flex-col items-center px-8">
        {/* Logo — expanding ring, then the mark settles in */}
        <div className="relative grid place-items-center">
          <span className="absolute w-32 h-32 rounded-3xl border border-brand/30 splash-ring" />
          <span className="absolute w-32 h-32 rounded-3xl border border-brand/20 splash-ring splash-ring-delay" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wolf-icon.png"
            alt="Wolf ERP"
            className="relative w-24 h-24 object-contain splash-mark drop-shadow-[0_8px_32px_rgba(37,99,235,0.45)]"
          />
        </div>

        {/* Wordmark */}
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-white splash-rise">
          Wolf
        </h1>
        <p className="mt-1 text-sm text-slate-400 tracking-[0.2em] uppercase splash-rise splash-rise-delay">
          Procurement ERP
        </p>

        {/* Determinate-looking sweep — motion without a fake percentage */}
        <div className="mt-9 w-52 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 splash-sweep" />
        </div>
      </div>

      <p className="absolute bottom-7 text-[11px] text-slate-600 tracking-wide">
        © {new Date().getFullYear()} Wolf ERP
      </p>
    </div>
  );
}
