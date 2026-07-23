"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";
import DemoDisclaimer from "@/components/shared/DemoDisclaimer";
import { Field, Input, Button } from "@/components/ui/kit";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in (e.g. a "keep me signed in" session survived a browser
  // restart)? Go straight to the dashboard. We act on the hydrated user (not
  // the slower server re-check), so the redirect fires immediately — never
  // after you've started typing into the form.
  useEffect(() => {
    if (user) router.replace(ROLE_HOME[user.role] || "/dashboard");
  }, [user, router]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});

  // ---- Validation ----
  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email address";

    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
    setServerError("");
  };

  // ---- Submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const user = await login(
        { email: form.email, password: form.password },
        form.remember
      );
      // ---- Role-based redirect ----
      router.push(ROLE_HOME[user.role] || "/dashboard");
    } catch (err) {
      setServerError(err.message || "Invalid email or password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // A session already exists — we're redirecting to the dashboard. Show a
  // brief loader instead of the form so it can't be filled in and submitted.
  if (user) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-fg-muted">
        <Loader2 size={20} className="animate-spin" /> Signing you in…
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-fg">Welcome back</h1>
      <p className="text-sm text-fg-muted mt-1 mb-6">
        Sign in to your Wolf workspace to continue.
      </p>

      {/* Demo disclaimer */}
      <DemoDisclaimer className="mb-5" />

      {/* Server error banner */}
      {serverError && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} className="shrink-0" />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email address" error={errors.email}>
          <Input
            type="email"
            icon={Mail}
            invalid={Boolean(errors.email)}
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <Input
            type={showPassword ? "text" : "password"}
            icon={Lock}
            invalid={Boolean(errors.password)}
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-fg-muted hover:text-fg transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </Field>

        {/* Remember me */}
        <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(e) => handleChange("remember", e.target.checked)}
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand/30"
          />
          <span className="text-sm text-fg-muted">Keep me signed in</span>
        </label>

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full !mt-6" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Switch to signup */}
      <p className="text-sm text-fg-muted mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
