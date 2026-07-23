import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/Modal";
import { themeScript } from "@/lib/theme";
import DesktopStatus from "@/components/shared/DesktopStatus";

export const metadata = {
  title: "Wolf ERP - Procurement Management",
  description: "Manage vendors, RFQs, approvals, and invoices in one platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint so there's no flash of
            the wrong palette. Must run before the body renders. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
              {/* Offline / update-ready notices. Renders nothing on the web. */}
              <DesktopStatus />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
