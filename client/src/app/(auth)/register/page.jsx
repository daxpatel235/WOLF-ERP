"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full system control" },
  { value: "manager", label: "Procurement Manager", desc: "Create RFQs & POs" },
  { value: "approver", label: "Approver", desc: "Review & sign off" },
  { value: "vendor", label: "Vendor", desc: "Submit quotations" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    name: "",
    organization: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "manager",
    agree: false,
  });
  const [errors, setErrors] = useState({});

  // ---- Validation ----
  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.organization.trim()) e.organization = "Organization is required";

    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email";

    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Use at least 8 characters";
    else if (!/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      e.password = "Include 1 uppercase letter and 1 number";

    if (form.confirmPassword !== form.password)
      e.confirmPassword = "Passwords do not match";

    if (!form.agree) e.agree = "You must accept the terms to continue";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
    setServerError("");
  };

  // ---- Password strength meter ----
  const passwordStrength = () => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        company: form.organization,
      });
      router.push(ROLE_HOME[user.role] || "/dashboard");
    } catch (err) {
      // Surface field-level errors from the API if present.
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }));
      setServerError(err.message || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength();
  const strengthColors = ["bg-slate-200", "bg-red-400", "bg-amber-400", "bg-amber-500", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="text-slate-500 mt-1">
          Join Wolf and bring order to your procurement.
        </p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name + Organization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Dax Patel"
                className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.name ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Organization
            </label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                placeholder="Acme Corp"
                className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.organization ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
            </div>
            {errors.organization && <p className="text-xs text-red-600 mt-1">{errors.organization}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="you@company.com"
              className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.email ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
          </div>
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Create a strong password"
              className={`w-full pl-10 pr-11 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.password ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Strength meter */}
          {form.password && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      i <= strength ? strengthColors[strength] : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 w-12">{strengthLabels[strength]}</span>
            </div>
          )}
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.confirmPassword ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Role selector — role-based authentication */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select your role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((role) => {
              const selected = form.role === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleChange("role", role.value)}
                  className={`relative text-left p-3 rounded-lg border transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                  <p className="text-sm font-semibold text-slate-900">{role.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{role.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => handleChange("agree", e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            <span className="text-sm text-slate-600">
              I agree to Wolf's{" "}
              <span className="text-blue-600 font-medium">Terms</span> and{" "}
              <span className="text-blue-600 font-medium">Privacy Policy</span>.
            </span>
          </label>
          {errors.agree && <p className="text-xs text-red-600 mt-1">{errors.agree}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}