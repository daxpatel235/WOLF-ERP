import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";

export const metadata = {
  title: "Wolf ERP — Track invoices, pay vendors, close books on one platform",
  description:
    "Wolf brings invoice automation, vendor payments, approvals and reporting together so your procurement runs like clockwork.",
};

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
