"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(null);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Read the token from the URL (?token=...). Done in an effect so the page
  // doesn't need a Suspense boundary for useSearchParams during prerender.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");

    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset your password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Missing/invalid token ----
  if (token === "") {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Invalid reset link</h2>
        <p className="text-slate-500 mt-2">
          This link is missing its reset token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 mt-6"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // ---- Success ----
  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-5">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Password reset</h2>
        <p className="text-slate-500 mt-2">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm shadow-blue-600/20"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Set a new password</h2>
        <p className="text-slate-500 mt-1">Choose a new password for your account.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              placeholder="Enter a new password"
              className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError(""); }}
              placeholder="Re-enter your new password"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mt-8"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>
    </div>
  );
}
