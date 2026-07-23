import Link from "next/link";
import LegalShell, { Section, List } from "@/components/marketing/LegalShell";

export const metadata = {
  title: "Terms & Conditions — Wolf ERP",
  description: "The terms that govern your use of Wolf ERP.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & Conditions"
      updated="13 June 2026"
      intro={
        <>
          <strong>Wolf ERP is a demonstration / portfolio project</strong> provided free of
          charge and “as is”. It carries no uptime guarantee, and data may be reset or
          removed at any time. Don&apos;t rely on it for real business operations or store
          sensitive data in it.
        </>
      }
    >
      <Section title="Agreement">
        <p>
          These Terms &amp; Conditions (“Terms”) govern your access to and use of the Wolf
          ERP application (the “Service”). By creating an account or using the Service, you
          agree to these Terms. If you don&apos;t agree, please don&apos;t use the Service.
        </p>
      </Section>

      <Section n="1" title="Nature of the Service (demo)">
        <p>
          The Service is a non-commercial demo built to showcase a procurement workflow. It
          is provided for evaluation and educational purposes only. There is no service-level
          agreement, no guaranteed availability, and no commitment to preserve your data —
          inactive workspaces are automatically wiped after 30 days (see the{" "}
          <Link href="/privacy" className="font-medium text-brand hover:text-brand-700">
            Privacy Policy
          </Link>
          ).
        </p>
      </Section>

      <Section n="2" title="Eligibility">
        <p>
          You must be at least 16 years old and able to form a binding agreement to use the
          Service. By using it, you confirm that you meet these requirements.
        </p>
      </Section>

      <Section n="3" title="Your account">
        <List
          items={[
            "You're responsible for the accuracy of the information you provide and for all activity under your account.",
            "Keep your password confidential; you're responsible for safeguarding it. Notify us of any unauthorized use.",
            "Self-registration grants standard (non-administrator) roles only.",
          ]}
        />
      </Section>

      <Section n="4" title="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "Use the Service for any unlawful, harmful, or fraudulent purpose.",
            "Upload real confidential, personal, financial, or otherwise sensitive third-party data.",
            "Attempt to breach, probe, overload, or disrupt the Service or its infrastructure, or bypass authentication and account isolation.",
            "Reverse-engineer, scrape, or abuse the API beyond reasonable demo use.",
            "Infringe the intellectual-property or privacy rights of others.",
          ]}
        />
      </Section>

      <Section n="5" title="Your content">
        <p>
          You retain ownership of the data you enter. You grant us the limited right to
          store and process it solely to operate the Service for you (including sending it to
          our processors as described in the Privacy Policy). You are responsible for the
          legality of the content you submit.
        </p>
      </Section>

      <Section n="6" title="AI features">
        <p>
          AI-assisted features are powered by a third-party model (Google Gemini) and are
          provided for convenience only. Output may be inaccurate, incomplete, or misleading;
          it is not professional, legal, or financial advice. Always review AI output before
          relying on it.
        </p>
      </Section>

      <Section n="7" title="Intellectual property">
        <p>
          The Service&apos;s code, design, branding, and content (excluding data you enter)
          are owned by the project author and protected by applicable laws. These Terms
          don&apos;t grant you any rights to our trademarks or branding.
        </p>
      </Section>

      <Section n="8" title="Disclaimer of warranties">
        <p>
          The Service is provided <strong>“as is” and “as available”</strong>, without
          warranties of any kind, express or implied, including merchantability, fitness for
          a particular purpose, and non-infringement. We don&apos;t warrant that the Service
          will be uninterrupted, secure, error-free, or that data will be retained.
        </p>
      </Section>

      <Section n="9" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the author shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of
          data, profits, or goodwill, arising from your use of (or inability to use) the
          Service. Since the Service is free and provided as a demo, total liability is
          limited to zero.
        </p>
      </Section>

      <Section n="10" title="Termination">
        <p>
          You may stop using the Service and request deletion of your account at any time. We
          may suspend or terminate access — and may modify or discontinue the Service —
          at any time, with or without notice, including to enforce these Terms.
        </p>
      </Section>

      <Section n="11" title="Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-law
          rules. Any disputes are subject to the courts of Mumbai, Maharashtra.
        </p>
      </Section>

      <Section n="12" title="Changes to these Terms">
        <p>
          We may revise these Terms from time to time. Changes are effective when posted, as
          reflected by the “Last updated” date above. Continued use after a change means you
          accept the revised Terms.
        </p>
      </Section>

      <Section n="13" title="Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a href="mailto:support@wolferp.in" className="font-medium text-brand hover:text-brand-700">
            support@wolferp.in
          </a>
          . See also our{" "}
          <Link href="/privacy" className="font-medium text-brand hover:text-brand-700">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
