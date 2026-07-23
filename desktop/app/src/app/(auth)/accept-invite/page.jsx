"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, Building2, Mail } from "lucide-react";
import { teamApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";

export default function AcceptInvitePage() {
  const router = useRouter();
  const { acceptInvite } = useAuth();

  const [token, setToken] = useState(null); // null = reading, "" = missing
  const [invite, setInvite] = useState(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState("");

  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read ?token= in an effect so the page needs no Suspense boundary.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  // Resolve the invitation so we can show who invited them and to which workspace.
  useEffect(() => {
    if (token === null) return;
    if (!token) {
      setInvalid("This link is missing its invitation token.");
      setChecking(false);
      return;
    }
    teamApi
      .previewInvite(token)
      .then((r) => setInvite(r.data))
      .catch((err) => setInvalid(err.message || "This invitation is invalid or has expired."))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Please enter your name");
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return setError("Password must be at least 8 characters and include an uppercase letter and a number");
    }
    if (form.password !== form.confirm) return setError("Passwords do not match");

    setError("");
    setLoading(true);
    try {
      const user = await acceptInvite({ token, name: form.name.trim(), password: form.password });
      router.push(ROLE_HOME[user.role] || "/dashboard");
    } catch (err) {
      setError(err.message || "Could not accept this invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-fg-muted">
        <Loader2 size={20} className="animate-spin" /> Checking your invitation…
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-fg">Invitation not valid</h2>
        <p className="text-fg-muted mt-2">{invalid}</p>
        <p className="text-sm text-fg-muted mt-2">Ask your workspace owner to send a new invite.</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-brand hover:text-brand-700 mt-6">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-fg">Join {invite.organization}</h2>
        <p className="text-fg-muted mt-1">Create your account to start collaborating.</p>
      </div>

      {/* Invitation summary */}
      <div className="flex items-start gap-2.5 p-3 mb-6 text-xs bg-blue-50 border border-blue-100 rounded-lg text-fg-muted">
        <Building2 size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="leading-relaxed">
          You've been invited to <span className="font-semibold text-fg">{invite.organization}</span> as
          a <span className="font-semibold text-fg capitalize">{invite.role}</span>.
          <span className="flex items-center gap-1 mt-1 text-fg-muted">
            <Mail size={12} /> {invite.email}
          </span>
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Full name</label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }}
              placeholder="Jane Cooper"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-11 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-muted"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError(""); }}
              placeholder="Re-enter your password"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Joining…
            </>
          ) : (
            `Join ${invite.organization}`
          )}
        </button>
      </form>

      <p className="text-center text-sm text-fg-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
