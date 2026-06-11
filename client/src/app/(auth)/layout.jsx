import Link from "next/link";

export const metadata = {
  title: "Sign in - Wolf ERP",
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffdf7] px-4 py-10">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <span className="text-slate-900 font-black text-xl">W</span>
        </div>
        <div className="leading-tight">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Wolf</h1>
          <p className="text-xs text-slate-500 -mt-0.5">Procurement ERP</p>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {children}
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-6">
        © {new Date().getFullYear()} Wolf ERP. All rights reserved.
      </p>
    </div>
  );
}
