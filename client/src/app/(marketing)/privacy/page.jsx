import Link from "next/link";
import LegalShell, { Section, List } from "@/components/marketing/LegalShell";

export const metadata = {
  title: "Privacy Policy — Wolf ERP",
  description: "How Wolf ERP collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="13 June 2026"
      intro={
        <>
          <strong>Wolf ERP is a demonstration / portfolio project</strong>, not a
          commercial service. Please don&apos;t enter real, confidential, or
          sensitive business data. Idle accounts and their data are
          automatically deleted (see “Data retention”).
        </>
      }
    >
      <Section title="Overview">
        <p>
          This Privacy Policy explains what information Wolf ERP (“we”, “us”) collects
          when you use the app at{" "}
          <span className="font-medium text-slate-800">wolf-erp.vercel.app</span>, how we
          use it, who we share it with, and the choices you have. By using the app you
          agree to this policy.
        </p>
      </Section>

      <Section n="1" title="Information we collect">
        <p>We only collect what the app needs to function:</p>
        <List
          items={[
            "Account details you provide: your name, email address, organization/company name, and chosen role.",
            "Your password — stored only as a salted bcrypt hash; we never store or can read your actual password.",
            "Content you create in the app: vendors, RFQs, quotations, purchase orders, invoices, approvals, and related notes.",
            "Technical data needed to run the session: a JWT authentication token (in your browser's storage), a small non-sensitive cookie used to route you to your dashboard, and basic server logs (e.g., request method/path) for debugging.",
          ]}
        />
        <p>
          We do <strong>not</strong> use third-party advertising or analytics trackers,
          and we don&apos;t sell your data.
        </p>
      </Section>

      <Section n="2" title="How we use your information">
        <List
          items={[
            "To create and secure your account and keep you signed in.",
            "To store and display the procurement data you enter, scoped privately to your account.",
            "To send transactional email such as password-reset links.",
            "To power optional AI features you explicitly trigger.",
            "To operate, debug, and protect the service (e.g., rate-limiting sign-in attempts).",
          ]}
        />
      </Section>

      <Section n="3" title="AI features and Google Gemini">
        <p>
          Optional AI features (drafting, comparison insights, summaries, vendor-risk and
          invoice-audit analysis, and the assistant chat) are powered by{" "}
          <strong>Google&apos;s Gemini API</strong>. When you trigger one of these, the
          relevant content (for example, an RFQ description or invoice details) is sent to
          Google to generate a response. Your use of these features is also subject to
          Google&apos;s privacy terms. If AI is not configured, these features are simply
          disabled and no data is sent. AI output can be inaccurate — always verify it.
        </p>
      </Section>

      <Section n="4" title="Service providers we use">
        <p>We rely on a few reputable processors to host and run the app:</p>
        <List
          items={[
            "Vercel — hosts the web frontend.",
            "Render — hosts the backend API.",
            "MongoDB Atlas — stores your account and procurement data.",
            "Google (Gemini API) — processes content only for AI features you trigger.",
            "An email/SMTP provider — delivers transactional emails such as password resets.",
          ]}
        />
        <p>
          These providers process data on our behalf to deliver the service and may store
          it on infrastructure outside your country.
        </p>
      </Section>

      <Section n="5" title="Cookies and local storage">
        <p>
          We use the minimum needed for authentication — no advertising cookies. Your
          sign-in token is kept in your browser&apos;s <em>localStorage</em> (if you choose
          “Keep me signed in”) or <em>sessionStorage</em> (cleared when you close the
          browser). We also set one small first-party cookie that stores only your
          dashboard path, so signed-in visitors are routed to the app without a flash of
          the landing page. Clearing your browser storage signs you out.
        </p>
      </Section>

      <Section n="6" title="Data retention">
        <p>
          Because this is a demo, storage is kept lean: if an account is inactive (no
          sign-in) for <strong>30 days</strong>, all of that workspace&apos;s data is
          automatically and permanently deleted. Your login record is preserved so you can
          sign back in and start fresh. You can also request deletion at any time (see “Your
          rights”).
        </p>
      </Section>

      <Section n="7" title="How we protect your data">
        <List
          items={[
            "Passwords are hashed with bcrypt; reset tokens are hashed and expire after 1 hour.",
            "Access requires a signed JWT, and every account's data is isolated so you only see your own.",
            "Traffic is served over HTTPS, and the API sends standard security headers and rate-limits sign-in attempts.",
          ]}
        />
        <p>
          No method of transmission or storage is 100% secure, and as a demo project we
          can&apos;t guarantee absolute security — another reason not to enter sensitive
          real-world data.
        </p>
      </Section>

      <Section n="8" title="Your rights and choices">
        <List
          items={[
            "Access & correct: view and edit your account details and content inside the app.",
            "Delete: remove individual records in the app, or email us to delete your entire account and data.",
            "Sign out / clear: log out, or clear browser storage, to remove the local session at any time.",
          ]}
        />
        <p>
          To exercise any of these, contact us at{" "}
          <a href="mailto:support@wolferp.in" className="font-medium text-blue-600 hover:text-blue-700">
            support@wolferp.in
          </a>
          .
        </p>
      </Section>

      <Section n="9" title="Children">
        <p>
          Wolf ERP is not directed to children under 16 and we do not knowingly collect
          their data. If you believe a child has provided information, contact us and we
          will delete it.
        </p>
      </Section>

      <Section n="10" title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by
          the “Last updated” date above. Continued use of the app after an update means you
          accept the revised policy.
        </p>
      </Section>

      <Section n="11" title="Contact">
        <p>
          Questions about this policy or your data? Email{" "}
          <a href="mailto:support@wolferp.in" className="font-medium text-blue-600 hover:text-blue-700">
            support@wolferp.in
          </a>
          . See also our{" "}
          <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
