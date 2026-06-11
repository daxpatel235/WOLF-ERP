"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) return setError("Email is required");
    if (!emailRegex.test(email)) return setError("Enter a valid email address");

    setError("");
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Success state ----
  if (sent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-5">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
        <p className="text-slate-500 mt-2">
          We've sent a password reset link to{" "}
          <span className="font-semibold text-slate-700">{email}</span>. It may
          take a minute to arrive.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-6"
        >
          Didn't get it? Resend
        </button>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mt-8"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
    );
  }

  // ---- Form state ----
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Forgot password?</h2>
        <p className="text-slate-500 mt-1">
          Enter your email and we'll send you a reset link.
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
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@company.com"
              className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                error ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
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
              <Loader2 size={18} className="animate-spin" /> Sending link...
            </>
          ) : (
            "Send reset link"
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