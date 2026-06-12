import { Info } from "lucide-react";

// Static notice shown on the login & register pages. Styled to match the auth
// cards' existing hint boxes (slate-50 / slate-200 / text-xs) so it reads as a
// native part of the page, not a bolted-on banner.
export default function DemoDisclaimer({ className = "" }) {
  return (
    <div
      className={`flex items-start gap-2.5 p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500 ${className}`}
    >
      <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
      <p className="leading-relaxed">
        <span className="font-semibold text-slate-600">Demo project by Dax Patel.</span>{" "}
        Anything you add here is for demonstration only and is automatically
        cleared after{" "}
        <span className="font-medium text-slate-600">30 days of inactivity</span>
        {" "}— your login always stays.
      </p>
    </div>
  );
}
